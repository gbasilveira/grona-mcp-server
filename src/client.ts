import { z } from 'zod';
import { validateConfig } from './config.js';
import { campaignIdSchema, campaignStatusSchema, createCampaignSchema, customerIdSchema, editLinkSchema, httpUrlSchema, updateCampaignSchema } from './schemas.js';
import type { Campaign, CreateCampaignRequest, EditLink, Envelope, GronaConfig, ScriptVerification, UpdateCampaignRequest, ValidatedEditLink } from './types.js';

const recoveryByCode: Record<string, string> = {
  invalid_request: 'Correct the named request fields and retry. Immutable campaign fields require a new campaign.',
  unauthorized: 'Check the server-side credential for this service and regenerate it in Grona if revoked.',
  forbidden: 'Check workspace access and plan limits; do not retry unchanged.',
  not_found: 'Read the current campaign or variation identifiers; check the workspace credential.',
  conflict: 'Fetch the campaign by externalId and compare its identity with the intended create before recovering.',
  rate_limited: 'Wait at least retryAfterMs when provided, then retry a safe operation.',
  internal: 'Retry safe operations with backoff. For uncertain mutations read current state first.',
  gateway_error: 'The upstream gateway failed. Retry safe operations with backoff.',
  network_error: 'Check connectivity. For an uncertain create recover by externalId; for mutations read current state.',
  timeout: 'The request timed out. Read current state before replaying a mutation; use externalId for create recovery.',
  invalid_response: 'The upstream response did not match its documented envelope. Retry reads or contact Grona support.',
  missing_credentials: 'Set GRONA_API_KEY for Embed or GRONA_MOBILE_API_KEY for mobile grants in the MCP server environment.',
  redirect_refused: 'The API redirected the request. Check the configured base URL; credentials were not forwarded.',
};
export class GronaError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly recovery: string;
  constructor(code: string, message: string, status = 0, retryable = false, retryAfterMs?: number) {
    super(message); this.name = 'GronaError'; this.code = code; this.status = status;
    this.retryable = retryable; this.retryAfterMs = retryAfterMs;
    this.recovery = recoveryByCode[code] ?? 'Branch on HTTP status and code; consult Grona API documentation for this response.';
  }
  toJSON(): {code: string; message: string; status: number; retryable: boolean; retryAfterMs?: number; recovery: string} {
    return { code: this.code, message: this.message, status: this.status, retryable: this.retryable, ...(this.retryAfterMs === undefined ? {} : { retryAfterMs: this.retryAfterMs }), recovery: this.recovery };
  }
}

const record = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
const variationResponse = record({id:z.string(),name:z.string().nullable(),type:z.string(),previewUrl:z.string().nullable()});
const campaignResponse = record({
  id:z.string(),externalId:z.string().nullable(),name:z.string(),status:z.string(),domain:z.string().nullable(),
  script:record({status:z.string(),checkedAt:z.string().nullable()}),createdAt:z.string(),updatedAt:z.string(),
  type:z.string(),pageTargeting:z.string(),segmentId:z.string().nullable(),segmentValue:z.string().nullable(),
  variations:z.array(variationResponse),
});
const editLinkResponse = record({editUrl:z.string(),variationId:z.string(),previewUrl:z.string().nullable(),generatedAt:z.string(),expiresAt:z.string()});
const validatedEditLinkResponse = record({valid:z.boolean(),refreshed:z.boolean(),editUrl:z.string(),variationId:z.string(),generatedAt:z.string(),expiresAt:z.string()});
const verifyResponse = record({url:z.string(),script:record({status:z.string(),checkedAt:z.string()})});
const envelopeResponse = <S extends z.ZodType>(schema:S) => record({data:schema,meta:record({workspaceId:z.string(),count:z.number().int().nonnegative().optional()})});
const statusCodes: Record<number, string> = {400:'invalid_request',401:'unauthorized',403:'forbidden',404:'not_found',409:'conflict',429:'rate_limited',500:'internal'};

/** Parse seconds or HTTP-date without ever scheduling an earlier retry than requested. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (value === null || !value.trim()) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.ceil(numeric * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : undefined;
}
function sanitized(message:string, secrets:(string|undefined)[]):string {
  let result = message;
  for (const secret of secrets) if (secret) result = result.split(secret).join('[REDACTED]');
  return result.replace(/gro_ed_[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:token|secret|api_key|key)=)[^\s&#"']+/gi, '$1[REDACTED]');
}
function parseInput<S extends z.ZodType>(schema:S, input:unknown):z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new GronaError('invalid_request', result.error.issues.map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`).join('; '), 400);
  return result.data;
}

export interface GronaClientOptions {
  fetch?: typeof fetch;
  sleep?: (ms:number)=>Promise<void>;
  random?: ()=>number;
}
/** Server-side client. Secrets never cross hosts or follow redirects. */
export class GronaClient {
  readonly config: GronaConfig;
  private readonly fetcher: typeof fetch;
  private readonly sleep: (ms:number)=>Promise<void>;
  private readonly random: ()=>number;
  constructor(config:GronaConfig, options:GronaClientOptions = {}) {
    this.config = Object.freeze(validateConfig(config));
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
    this.random = options.random ?? Math.random;
  }
  async listCampaigns():Promise<Envelope<Campaign[]>> {
    return this.request('GET','/campaigns',undefined,z.array(campaignResponse),true) as Promise<Envelope<Campaign[]>>;
  }
  async createCampaign(body:CreateCampaignRequest):Promise<Envelope<Campaign>> {
    const parsed = parseInput(createCampaignSchema,body);
    return this.request('POST','/campaigns',parsed,campaignResponse,!!parsed.externalId) as Promise<Envelope<Campaign>>;
  }
  async getCampaign(campaignId:string):Promise<Envelope<Campaign>> {
    return this.request('GET',`/campaigns/${encodeURIComponent(parseInput(campaignIdSchema,campaignId))}`,undefined,campaignResponse,true) as Promise<Envelope<Campaign>>;
  }
  async updateCampaign(campaignId:string,body:UpdateCampaignRequest):Promise<Envelope<Campaign>> {
    return this.request('PATCH',`/campaigns/${encodeURIComponent(parseInput(campaignIdSchema,campaignId))}`,parseInput(updateCampaignSchema,body),campaignResponse,false) as Promise<Envelope<Campaign>>;
  }
  async deleteCampaign(campaignId:string):Promise<Envelope<{id:string;deletedVariationIds:string[];[key:string]:unknown}>> {
    return this.request('DELETE',`/campaigns/${encodeURIComponent(parseInput(campaignIdSchema,campaignId))}`,undefined,record({id:z.string(),deletedVariationIds:z.array(z.string())}),false);
  }
  async setCampaignStatus(campaignId:string,status:'live'|'paused'):Promise<Envelope<{status:string;[key:string]:unknown}>> {
    return this.request('PATCH',`/campaigns/${encodeURIComponent(parseInput(campaignIdSchema,campaignId))}/status`,{status:parseInput(campaignStatusSchema,status)},record({status:z.string()}),false);
  }
  async createEditLink(body:{variationId?:string;url?:string}):Promise<Envelope<EditLink>> {
    return this.request('POST','/variations/edit-link',parseInput(editLinkSchema,body),editLinkResponse,true);
  }
  async validateEditLink(editUrl:string):Promise<Envelope<ValidatedEditLink>> {
    return this.request('POST','/variations/edit-link/validate',{editUrl:parseInput(httpUrlSchema,editUrl)},validatedEditLinkResponse,true);
  }
  async verifyScript(url:string):Promise<Envelope<ScriptVerification>> {
    return this.request('POST','/websites/verify-script',{url:parseInput(httpUrlSchema,url)},verifyResponse,true,false,this.config.verifyTimeoutMs);
  }
  async issueGrants(customerId:string):Promise<Envelope<{grants:string[];[key:string]:unknown}>> {
    return this.request('POST','/v1/mobile/grants',{customerId:parseInput(customerIdSchema,customerId)},record({grants:z.array(z.string().max(4096))}),true,true);
  }
  private async request<S extends z.ZodType>(method:string,path:string,body:unknown,dataSchema:S,safe:boolean,mobile=false,timeoutMs=this.config.timeoutMs):Promise<Envelope<z.output<S>>> {
    const apiKey = mobile ? this.config.mobileApiKey : this.config.apiKey;
    if (!apiKey) throw new GronaError('missing_credentials', `Missing ${mobile ? 'GRONA_MOBILE_API_KEY' : 'GRONA_API_KEY'}.`);
    const headers:Record<string,string> = {Accept:'application/json'};
    if (mobile || this.config.authMode === 'bearer') headers.Authorization = `Bearer ${apiKey}`;
    else headers['X-API-Key'] = apiKey;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const url = `${mobile ? this.config.mobileBaseUrl : this.config.baseUrl}${path}`;
    const secrets = [this.config.apiKey,this.config.mobileApiKey];
    for (let attempt = 0; ; attempt++) {
      let failure:GronaError;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(),timeoutMs);
      try {
        const response = await this.fetcher(url,{method,headers,body:body === undefined ? undefined : JSON.stringify(body),redirect:'manual',signal:controller.signal});
        if (response.status >= 300 && response.status < 400) throw new GronaError('redirect_refused','API redirect refused; credentials were not forwarded.',response.status);
        const text = await response.text();
        let parsed:unknown;
        try { parsed = JSON.parse(text); } catch { parsed = undefined; }
        if (response.ok) {
          const result = envelopeResponse(dataSchema).safeParse(parsed);
          if (!result.success) throw new GronaError('invalid_response','Upstream returned a malformed success envelope.',response.status);
          return result.data as Envelope<z.output<S>>;
        }
        const errorBody = typeof parsed === 'object' && parsed !== null && 'error' in parsed ? (parsed as {error:unknown}).error : undefined;
        const error = typeof errorBody === 'object' && errorBody !== null ? errorBody as Record<string,unknown> : undefined;
        const transient = response.status === 429 || response.status >= 500;
        const code = typeof error?.code === 'string' ? sanitized(error.code,secrets) : statusCodes[response.status] ?? (response.status >= 500 ? 'gateway_error' : 'http_error');
        const message = typeof error?.message === 'string' ? sanitized(error.message,secrets) : `Grona returned HTTP ${response.status}.`;
        failure = new GronaError(code,message,response.status,safe && transient,parseRetryAfter(response.headers.get('Retry-After')));
      } catch (error) {
        if (error instanceof GronaError) failure = error;
        else failure = new GronaError(controller.signal.aborted ? 'timeout' : 'network_error',controller.signal.aborted ? 'Grona request timed out.' : 'Could not reach Grona.',0,safe);
      } finally { clearTimeout(timeout); }
      if (!failure.retryable || attempt >= this.config.maxRetries) throw failure;
      const backoff = 500 * 2 ** attempt * (1 + Math.min(1,Math.max(0,this.random())));
      const delay = Math.max(backoff,failure.retryAfterMs ?? 0);
      // A server asking for a long wait must not be retried sooner just to fit our budget.
      if (delay > this.config.maxRetryDelayMs) throw failure;
      await this.sleep(delay);
    }
  }
}
