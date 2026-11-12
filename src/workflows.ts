import { z } from 'zod';
import { GronaError, type GronaClient } from './client.js';
import type { Campaign, CreateCampaignRequest } from './types.js';
import { createCampaignSchema, httpUrlSchema, segmentIdSchema, segmentValueSchema } from './schemas.js';
export type WorkflowClient = Pick<GronaClient, 'listCampaigns' | 'createCampaign' | 'getCampaign' | 'updateCampaign' | 'setCampaignStatus' | 'createEditLink' | 'verifyScript'>;
export class WorkflowError extends Error {
  constructor(readonly code: string, message: string, readonly details: Record<string, unknown> = {}) { super(message); this.name = 'WorkflowError'; }
  toJSON() { return { code: this.code, message: this.message, ...this.details }; }
}
const campaignId = z.string().min(1).describe('Opaque Grona campaign id or externalId.');
export const searchCampaignsSchema = z.object({
  query: z.string().optional().describe('Case-insensitive substring of name, id, externalId or domain.'),
  status: z.string().optional(), type: z.string().optional(), domain: z.string().optional(), scriptStatus: z.string().optional(), externalId: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'id']).default('name'), order: z.enum(['asc', 'desc']).default('asc'),
  offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(1000).default(100),
}).strict();
export const createOnceSchema = z.object({ campaign: createCampaignSchema.refine(v => !!v.externalId, { message: 'externalId is required for create-once recovery', path: ['externalId'] }) }).strict();
export const campaignRefSchema = z.object({ campaignId }).strict();
export const launchSchema = z.object({ campaignId, edited: z.literal(true).describe('Attest saved edits have been reviewed.'), previewed: z.literal(true).describe('Attest every intended variation has been previewed.') }).strict();
export const abSplitSchema = z.object({ campaignId, Control: z.number().int().min(0).max(100), Test: z.number().int().min(0).max(100) }).strict().refine(v => v.Control + v.Test === 100, { message: 'Control + Test must total 100' });
export const targetingSchema = z.object({
  url: httpUrlSchema.describe('Original campaign sample URL retained from creation.'), type: z.enum(['general', 'abTest']).default('general'), pageTargeting: z.enum(['specific', 'multiple']).default('specific'),
  slug: z.string().min(1).optional(), condition: z.enum(['included', 'not_included']).default('included'), list: z.array(z.string().trim().min(1).max(200)).min(1).max(50).optional(),
  urls: z.array(httpUrlSchema).min(1).max(1000), segmentId: segmentIdSchema.optional(), segmentValue: segmentValueSchema.optional(), pageVariables: z.record(z.string(), z.string()).optional(),
}).strict().superRefine((v, ctx) => {
  if (v.pageTargeting === 'multiple') {
    if (!v.slug) ctx.addIssue({ code: 'custom', path: ['slug'], message: 'multiple targeting requires slug' });
    if (!v.list) ctx.addIssue({ code: 'custom', path: ['list'], message: 'multiple targeting requires list' });
    let samplePath: string | undefined;
    try { samplePath = new URL(v.url).pathname; } catch { /* URL schema supplies the issue. */ }
    if (v.slug && samplePath !== undefined && !samplePath.split('/').filter(Boolean).includes(v.slug)) ctx.addIssue({ code: 'custom', path: ['slug'], message: 'slug must occur exactly in sample URL path' });
  } else if (v.slug !== undefined || v.list !== undefined) ctx.addIssue({ code: 'custom', message: 'slug/list only apply to multiple targeting' });
  if ((v.segmentId === undefined) !== (v.segmentValue === undefined)) ctx.addIssue({ code: 'custom', message: 'segmentId and segmentValue must be supplied together' });
});
export const snippetSchema = z.object({ workspaceId: z.string().regex(/^[A-Za-z0-9_-]+$/).min(1).max(128), segmentId: segmentIdSchema.optional(), segmentValue: segmentValueSchema.optional() }).strict().refine(v => (v.segmentId === undefined) === (v.segmentValue === undefined), { message: 'segmentId and segmentValue must be supplied together' });
export async function searchCampaigns(client: WorkflowClient, input: z.infer<typeof searchCampaignsSchema>) {
  const response = await client.listCampaigns(); const q = input.query?.toLocaleLowerCase();
  const matched = response.data.filter(c => (!q || [c.name, c.id, c.externalId, c.domain].some(v => typeof v === 'string' && v.toLocaleLowerCase().includes(q))) && (input.status === undefined || c.status === input.status) && (input.type === undefined || c.type === input.type) && (input.domain === undefined || c.domain === input.domain) && (input.externalId === undefined || c.externalId === input.externalId) && (input.scriptStatus === undefined || c.script.status === input.scriptStatus));
  matched.sort((a, b) => { const l = String(a[input.sortBy] ?? ''), r = String(b[input.sortBy] ?? ''); const cmp = l < r ? -1 : l > r ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0; return input.order === 'desc' ? -cmp : cmp; });
  const data = matched.slice(input.offset, input.offset + input.limit);
  return { data, meta: { ...response.meta, upstreamCount: response.data.length, matchedCount: matched.length, count: data.length, offset: input.offset, limit: input.limit, localPagination: true } };
}
function originalPage(c: Campaign): string | null {
  if (typeof c.url === 'string') return c.url;
  const preview = c.variations.find(v => typeof v.previewUrl === 'string')?.previewUrl;
  if (!preview) return null;
  try { const u = new URL(preview); u.search = ''; u.hash = ''; return u.href; } catch { return null; }
}
function blockingVariations(c: Campaign): string[] {
  const blockers: string[] = [];
  if (!c.variations.length) blockers.push('Campaign has no variations.');
  for (const v of c.variations) if (v.name === null || !v.previewUrl) blockers.push(`Variation ${v.id} is missing or has no usable preview page.`);
  if (c.type === 'abTest') { const ids = c.variations.map(v => v.id), split = c.trafficSplit;
    if (!split || ids.length !== 2 || Object.keys(split).length !== ids.length || ids.some(id => !Number.isInteger(split[id]) || (split[id] ?? -1) < 0 || (split[id] ?? 101) > 100) || Object.values(split).reduce((a, b) => a + b, 0) !== 100) blockers.push('A/B traffic split or variation membership is invalid.');
  }
  if (!['general', 'abTest'].includes(c.type)) blockers.push(`Unknown campaign type ${c.type}; inspect before launching.`);
  if (!['specific', 'multiple'].includes(c.pageTargeting)) blockers.push(`Unknown page targeting ${c.pageTargeting}; inspect before launching.`);
  return blockers;
}
export async function campaignOverview(client: WorkflowClient, campaignId: string) {
  const result = await client.getCampaign(campaignId); const c = result.data;
  return { ...result, overview: { pageUrl: originalPage(c), previewLinks: c.variations.map(v => ({ variationId: v.id, name: v.name, previewUrl: v.previewUrl })), blockers: blockingVariations(c), nextSteps: ['Verify campaign page with grona_check_campaign_readiness.', 'Mint editor links on demand; edit and save in visual editor.', 'Preview every intended variation; call grona_launch_campaign with edited=true and previewed=true.'], limitations: ['No campaign-results API exists.', 'Reads omit editor links.', 'Saved edits, consent, CSP and browser execution are not API-observable.'] } };
}
export async function checkReadiness(client: WorkflowClient, campaignId: string) {
  const response = await client.getCampaign(campaignId); const c = response.data, blockers = blockingVariations(c), pageUrl = originalPage(c);
  let installation: Awaited<ReturnType<WorkflowClient['verifyScript']>> | null = null;
  if (!pageUrl) blockers.push('Cannot derive campaign page from stored url or previews.');
  else { installation = await client.verifyScript(pageUrl); if (installation.data.script.status !== 'present') blockers.push('Fresh Embed verification did not return present. absent can also mean inaccessible page.'); }
  return { data: { campaign: c, pageUrl, installation: installation?.data ?? null, ready: blockers.length === 0, blockers, manualChecks: ['Review and save intended edits.', 'Preview every variation.', 'Check execution, consent, CSP and anti-flicker in browser.'], advisory: 'Only API-observable checks; does not prove edits were saved or previewed.' }, meta: response.meta };
}
export async function launchCampaign(client: WorkflowClient, input: z.infer<typeof launchSchema>) {
  launchSchema.parse(input); const readiness = await checkReadiness(client, input.campaignId);
  if (!readiness.data.ready) throw new WorkflowError('not_ready', 'Campaign failed launch readiness; no status change was sent.', { blockers: readiness.data.blockers, completedSteps: ['read_campaign', ...(readiness.data.installation ? ['verify_campaign_page'] : [])] });
  let result: Awaited<ReturnType<WorkflowClient['setCampaignStatus']>>;
  try { result = await client.setCampaignStatus(readiness.data.campaign.id, 'live'); }
  catch (error) {
    // GronaClient normalizes and redacts GronaError fields; unexpected exceptions
    // must never expose raw messages that could contain editor links or secrets.
    const cause = error instanceof GronaError ? error.toJSON() : undefined;
    const progress = { campaignId: readiness.data.campaign.id, completedSteps: ['read_campaign', 'verify_campaign_page'], attemptedStep: 'set_live' };
    if (error instanceof GronaError && ([400, 401, 403, 404, 409, 429].includes(error.status) || error.code === 'missing_credentials')) {
      throw new WorkflowError(error.code, error.message, { ...cause, ...progress, cause });
    }
    throw new WorkflowError('launch_outcome_uncertain', 'Launch request failed; status may have changed. Read the campaign by immutable id before retrying.', { ...progress, ...(cause ? { cause } : {}), recovery: 'Read current campaign status before retrying the mutation.' });
  }
  return { ...result, campaignId: readiness.data.campaign.id, verifiedPageUrl: readiness.data.pageUrl, completedSteps: ['read_campaign', 'verify_campaign_page', 'set_live'], note: 'Allow propagation time before visitors see changes.' };
}
export async function setAbSplit(client: WorkflowClient, input: z.infer<typeof abSplitSchema>) {
  abSplitSchema.parse(input); const c = (await client.getCampaign(input.campaignId)).data;
  if (c.type !== 'abTest') throw new WorkflowError('invalid_campaign_type', 'Traffic splits only apply to abTest campaigns.');
  const controls = c.variations.filter(v => v.type === 'control' && v.name !== null), tests = c.variations.filter(v => v.type === 'variant' && v.name !== null);
  if (controls.length !== 1 || tests.length !== 1 || c.variations.length !== 2) throw new WorkflowError('invalid_variations', 'Expected exactly one usable Control and one Test variation.');
  const trafficSplit = { [controls[0]!.id]: input.Control, [tests[0]!.id]: input.Test };
  const result = await client.updateCampaign(c.id, { trafficSplit }); return { ...result, resolvedRoles: { Control: controls[0]!.id, Test: tests[0]!.id } };
}
function identityMismatches(c: Campaign, request: CreateCampaignRequest): string[] {
  const differences: string[] = [];
  for (const field of ['name', 'externalId', 'segmentId', 'segmentValue'] as const) if (c[field] !== request[field]) differences.push(field);
  if (c.type !== (request.type ?? 'general')) differences.push('type');
  if (c.pageTargeting !== (request.pageTargeting ?? 'specific')) differences.push('pageTargeting');
  const requested = new URL(request.url), actualPage = originalPage(c);
  if (!actualPage) differences.push('url (no comparable page)');
  else { const actual = new URL(actualPage); if (actual.origin !== requested.origin || actual.pathname !== requested.pathname) differences.push('url');
    // Specific A/B targeting includes the original exact URL. Reads omit that
    // URL and preview query parameters are undocumented: even a queryless new
    // request cannot prove the existing campaign had no original query.
    if ((request.type ?? 'general') === 'abTest' && (request.pageTargeting ?? 'specific') === 'specific') differences.push('original specific A/B URL cannot be verified from API preview links'); }
  if ((request.pageTargeting ?? 'specific') === 'multiple') {
    if (c.slug !== request.slug) differences.push('slug'); if (c.condition !== (request.condition ?? 'included')) differences.push('condition');
    if (JSON.stringify([...new Set(request.list?.map(v => v.trim()) ?? [])].sort()) !== JSON.stringify([...new Set(c.list ?? [])].sort())) differences.push('list');
  }
  if ((request.type ?? 'general') === 'abTest') { const ctrl = c.variations.find(v => v.type === 'control'), test = c.variations.find(v => v.type === 'variant');
    if (!ctrl || !test || c.trafficSplit?.[ctrl.id] !== (request.trafficSplit?.Control ?? 50) || c.trafficSplit?.[test.id] !== (request.trafficSplit?.Test ?? 50)) differences.push('trafficSplit'); }
  return differences;
}
export async function createCampaignOnce(client: WorkflowClient, request: CreateCampaignRequest) {
  if (!request.externalId) throw new WorkflowError('invalid_request', 'externalId is required for create-once recovery.');
  try { return { ...(await client.createCampaign(request)), recovered: false, completedSteps: ['create_campaign'] }; }
  catch (error) { if (!(error instanceof Error) || !('status' in error) || error.status !== 409 || !('code' in error) || error.code !== 'conflict') throw error; }
  const response = await client.getCampaign(request.externalId); const c = response.data, mismatches = identityMismatches(c, request);
  if (mismatches.length) throw new WorkflowError('create_conflict_mismatch', 'externalId belongs to a campaign that cannot be proven to match requested creation. Nothing existing was modified.', { campaignId: c.id, mismatches, completedSteps: ['create_conflict', 'read_existing_campaign'] });
  const completedSteps = ['create_conflict', 'read_existing_campaign', 'compare_creation_identity']; const variations = [];
  for (const v of c.variations) {
    try { const link = await client.createEditLink({ variationId: v.id }); variations.push({ ...v, ...link.data }); completedSteps.push(`create_edit_link:${v.id}`); }
    catch { throw new WorkflowError('partial_workflow', 'Campaign exists but not every editor link could be refreshed. Fetch fresh links by variation id.', { campaignId: c.id, failedVariationId: v.id, completedSteps }); }
  }
  return { ...response, data: { ...c, variations }, recovered: true, completedSteps };
}
export function evaluatePageTargeting(input: z.infer<typeof targetingSchema>) {
  const p = targetingSchema.parse(input), sample = new URL(p.url), sampleSegments = sample.pathname.split('/').filter(Boolean), position = sampleSegments.indexOf(p.slug ?? '');
  const segmentMatches = p.segmentId === undefined || p.pageVariables === undefined ? null : p.pageVariables[p.segmentId] === p.segmentValue;
  const results = p.urls.map(url => { const candidate = new URL(url), segments = candidate.pathname.split('/').filter(Boolean); let pageMatches = false, reason: string;
    if (candidate.origin !== sample.origin) reason = 'different_origin';
    else if (p.pageTargeting === 'specific') { pageMatches = p.type === 'abTest' ? candidate.href === sample.href : candidate.pathname === sample.pathname; reason = pageMatches ? 'specific_page_match' : 'specific_page_mismatch'; }
    else if (segments.length !== sampleSegments.length) reason = 'different_segment_count';
    else { const inList = p.list!.includes(segments[position]!); pageMatches = p.condition === 'included' ? inList : !inList; reason = pageMatches ? 'multiple_page_match' : 'segment_rule_mismatch'; }
    return { url, pageMatches, segmentMatches, eligible: !pageMatches ? false : p.segmentId !== undefined && segmentMatches === null ? null : segmentMatches !== false, reason, ...(p.pageTargeting === 'multiple' ? { comparedSegment: segments[position] ?? null, position } : {}) };
  });
  return { data: results, meta: { count: results.length, localOnly: true, note: 'Eligibility does not prove execution or select variation. Specific A/B comparison conservatively includes full supplied URL. Retain creation URL; reads omit it for specific campaigns.' } };
}
function escapeHtml(v: string) { return v.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;'); }
export function generateSnippet(input: z.infer<typeof snippetSchema>) {
  const p = snippetSchema.parse(input), id = escapeHtml(p.workspaceId), assignment = p.segmentId ? `<script>window[${JSON.stringify(p.segmentId)}] = ${JSON.stringify(p.segmentValue)};</script>\n` : '';
  return { data: { workspaceId: p.workspaceId, html: `${assignment}<link rel="preconnect" href="https://personalize.grona.ai" />\n<script data-grona-embed-script="${id}" src="https://personalize.grona.ai/workspaces/${encodeURIComponent(p.workspaceId)}.js" type="text/javascript" async></script>`, instructions: ['Place in <head> on every campaign page; set page variable above Embed snippet.', 'Prefer dashboard snippet if it contains workspace anti-flicker line.', 'Verify exact page using grona_verify_script.', 'CSP must permit personalize.grona.ai, services.grona.ai and Embed inline styles; test variations.'] }, meta: { localOnly: true } };
}
