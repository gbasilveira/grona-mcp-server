import { describe, expect, it, vi } from 'vitest';
import { GronaClient, GronaError, parseRetryAfter } from '../src/client.js';
import { loadConfig } from '../src/config.js';
import type { Campaign } from '../src/types.js';

const campaign: Campaign = {
  id:'campaign-1',externalId:'CMP-1',name:'Campaign',status:'paused',domain:'https://shop.example.com',
  script:{status:'checking',checkedAt:null},createdAt:'2026-11-12T10:00:00.000Z',updatedAt:'2026-11-12T10:00:00.000Z',
  type:'general',pageTargeting:'specific',segmentId:'audience_id',segmentValue:'buyer',
  variations:[{id:'var-1',name:'Variation',type:'variant',previewUrl:'https://shop.example.com/?preview=1'}],
};
const create = {name:'Campaign',url:'https://shop.example.com/',segmentId:'audience_id',segmentValue:'buyer'};
const envelope = (data:unknown) => ({data,meta:{workspaceId:'workspace-1'}});
const json = (data:unknown,status=200,headers:Record<string,string>={}) => new Response(JSON.stringify(data),{status,headers});
const make = (responses:(Response|Error)[], config:Parameters<typeof loadConfig>[0]={}) => {
  const fetcher = vi.fn(async () => {
    const next = responses.shift(); if (!next) throw new Error('Missing fixture');
    if (next instanceof Error) throw next; return next;
  });
  const sleep=vi.fn(async (_:number)=>{});
  const client = new GronaClient(loadConfig({GRONA_API_KEY:'embed-secret',GRONA_MOBILE_API_KEY:'mobile-secret',...config}),{fetch:fetcher as typeof fetch,sleep,random:()=>0});
  return {client,fetcher,sleep};
};

describe('all ten routes',()=>{
  it('sends original routes, bodies, envelope metadata and correct isolated credentials',async()=>{
    const link={editUrl:'https://services.grona.ai/editor?token=secret',variationId:'var-1',previewUrl:null,generatedAt:'2026-11-12T10:00:00Z',expiresAt:'2026-11-12T10:15:00Z'};
    const {client,fetcher}=make([
      json({...envelope([campaign]),meta:{workspaceId:'workspace-1',count:1}}),json(envelope(campaign),201),json(envelope(campaign)),
      json(envelope(campaign)),json(envelope({id:'campaign-1',deletedVariationIds:['var-1']})),json(envelope({status:'live'})),
      json(envelope(link)),json(envelope({...link,valid:false,refreshed:true})),json(envelope({url:create.url,script:{status:'present',checkedAt:'now'}})),json(envelope({grants:['signed-token']})),
    ]);
    expect((await client.listCampaigns()).meta.count).toBe(1);
    await client.createCampaign(create);
    await client.getCampaign('id with/slash?');
    await client.updateCampaign('CMP-1',{externalId:null,segmentValue:'loyal'});
    await client.deleteCampaign('CMP-1');
    await client.setCampaignStatus('CMP-1','live');
    await client.createEditLink({variationId:'var-1',url:create.url});
    await client.validateEditLink(link.editUrl);
    await client.verifyScript(create.url);
    expect((await client.issueGrants('cus_1')).data.grants).toEqual(['signed-token']);
    const calls=fetcher.mock.calls as unknown as [string,RequestInit][];
    const base='https://services.grona.ai/api/public/v1';
    expect(calls.map(([url,init])=>[init.method,url])).toEqual([
      ['GET',`${base}/campaigns`],['POST',`${base}/campaigns`],['GET',`${base}/campaigns/id%20with%2Fslash%3F`],
      ['PATCH',`${base}/campaigns/CMP-1`],['DELETE',`${base}/campaigns/CMP-1`],['PATCH',`${base}/campaigns/CMP-1/status`],
      ['POST',`${base}/variations/edit-link`],['POST',`${base}/variations/edit-link/validate`],['POST',`${base}/websites/verify-script`],['POST','https://api.grona.ai/v1/mobile/grants'],
    ]);
    expect(calls.slice(0,9).every(([,init])=>(init.headers as Record<string,string>).Authorization==='Bearer embed-secret')).toBe(true);
    expect(calls[9]![1].headers).toMatchObject({Authorization:'Bearer mobile-secret'});
    expect(calls.every(([,init])=>init.redirect==='manual')).toBe(true);
    expect(JSON.parse(calls[3]![1].body as string)).toEqual({externalId:null,segmentValue:'loyal'});
    expect(JSON.parse(calls[7]![1].body as string)).toEqual({editUrl:link.editUrl});
    expect(JSON.parse(calls[9]![1].body as string)).toEqual({customerId:'cus_1'});
  });
  it('uses X-API-Key for Embed but always Bearer for mobile',async()=>{
    const {client,fetcher}=make([json(envelope([])),json(envelope({grants:[]}))],{GRONA_AUTH_MODE:'header'});
    await client.listCampaigns(); await client.issueGrants('customer');
    const calls=fetcher.mock.calls as unknown as [string,RequestInit][];
    expect(calls[0]![1].headers).toMatchObject({'X-API-Key':'embed-secret'});
    expect(calls[0]![1].headers).not.toHaveProperty('Authorization');
    expect(calls[1]![1].headers).toMatchObject({Authorization:'Bearer mobile-secret'});
    expect(calls[1]![1].headers).not.toHaveProperty('X-API-Key');
  });
  it('never substitutes Embed credentials for a missing mobile key',async()=>{
    const fetcher=vi.fn();
    const client=new GronaClient(loadConfig({GRONA_API_KEY:'embed-secret'}),{fetch:fetcher});
    await expect(client.issueGrants('customer')).rejects.toMatchObject({code:'missing_credentials'});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['.', '..'])('rejects unsafe dot-only path identifiers %s before fetch',async id=>{
    const {client,fetcher}=make([]);
    await expect(client.getCampaign(id)).rejects.toMatchObject({code:'invalid_request'});
    await expect(client.deleteCampaign(id)).rejects.toMatchObject({code:'invalid_request'});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('allows offline construction and fails only the operation requiring missing credentials',async()=>{
    const client=new GronaClient(loadConfig({}));
    await expect(client.listCampaigns()).rejects.toMatchObject({code:'missing_credentials'});
  });
  it('preserves future enum values and fields',async()=>{
    const future={...campaign,status:'scheduled',type:'newType',future:{value:1},script:{status:'newStatus',checkedAt:null,extra:2}};
    const payload={...envelope(future),extension:true,meta:{workspaceId:'workspace-1',extra:'future'}};
    const {client}=make([json(payload)]);
    expect(await client.getCampaign('campaign')).toEqual(payload);
  });
  it.each([{}, {data:[]}, {data:[],meta:{}}, {data:{id:'only'},meta:{workspaceId:'w'}}])('rejects malformed success response %j',async payload=>{
    const {client,fetcher}=make([json(payload)]);
    await expect(client.getCampaign('campaign')).rejects.toMatchObject({code:'invalid_response'});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('safe retries',()=>{
  it('retries 429 after at least Retry-After and preserves final response',async()=>{
    const {client,fetcher,sleep}=make([json({error:{code:'rate_limited',message:'Slow down'}},429,{'Retry-After':'2'}),json(envelope([]))]);
    await client.listCampaigns();
    expect(fetcher).toHaveBeenCalledTimes(2); expect(sleep).toHaveBeenCalledWith(2000);
  });
  it('retries gateway and network errors with exponential backoff',async()=>{
    const {client,sleep}=make([new Response('<html>gateway</html>',{status:502}),new TypeError('network detail secret'),json(envelope([]))]);
    await client.listCampaigns(); expect(sleep.mock.calls).toEqual([[500],[1000]]);
  });
  it('supports date Retry-After on mobile 503 without JSON',async()=>{
    const retryAt=new Date(Date.now()+10_000).toUTCString();
    const {client,sleep}=make([new Response('Unavailable',{status:503,headers:{'Retry-After':retryAt}}),json(envelope({grants:[]}))]);
    await client.issueGrants('customer'); expect(sleep.mock.calls[0]![0]).toBeGreaterThan(8000);
  });
  it('does not retry earlier when Retry-After exceeds the configured budget',async()=>{
    const {client,fetcher,sleep}=make([json({error:{code:'rate_limited',message:'Wait'}},429,{'Retry-After':'120'})]);
    await expect(client.listCampaigns()).rejects.toMatchObject({retryAfterMs:120000});
    expect(sleep).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('never retries uncertain creates lacking externalId',async()=>{
    const {client,fetcher}=make([new TypeError('Lost response'),json(envelope(campaign),201)]);
    await expect(client.createCampaign(create)).rejects.toMatchObject({code:'network_error',retryable:false});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retries creates protected by externalId and exposes 409 for explicit recovery',async()=>{
    const {client,fetcher}=make([new TypeError('Lost response'),json({error:{code:'conflict',message:'Already exists'}},409)]);
    await expect(client.createCampaign({...create,externalId:'CMP-1'})).rejects.toMatchObject({code:'conflict',status:409});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each(['update','delete','status'])('never replays %s by mutable externalId',async operation=>{
    const {client,fetcher}=make([json({error:{code:'internal',message:'Failed'}},500),json(envelope(campaign))]);
    const call=operation==='update'?client.updateCampaign('CMP-1',{externalId:null}):operation==='delete'?client.deleteCampaign('CMP-1'):client.setCampaignStatus('CMP-1','live');
    await expect(call).rejects.toMatchObject({status:500,retryable:false}); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('bounds attempts and exposes useful normalized errors',async()=>{
    const {client,fetcher}=make([json({},503),json({},503),json({},503)]);
    try { await client.listCampaigns(); throw new Error('Expected failure'); }
    catch(error) { expect((error as GronaError).toJSON()).toMatchObject({code:'gateway_error',status:503,retryable:true,recovery:expect.any(String)}); }
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it.each([400,401,403,404,409])('does not retry HTTP %s',async status=>{
    const {client,fetcher}=make([json({error:{code:'future_code',message:'Problem'}},status)]);
    await expect(client.listCampaigns()).rejects.toMatchObject({status,code:'future_code',retryable:false}); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('refuses redirects without exposing location or forwarding secrets',async()=>{
    const {client,fetcher}=make([new Response(null,{status:302,headers:{Location:'https://untrusted.example.com/'}})]);
    await expect(client.listCampaigns()).rejects.toMatchObject({code:'redirect_refused'}); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('redacts configured credentials and editor tokens from API errors',async()=>{
    const {client}=make([json({error:{code:'invalid_request',message:'embed-secret mobile-secret gro_ed_key_secret https://services.grona.ai/editor?token=linksecret'}},400)]);
    try { await client.listCampaigns(); } catch(error) {
      const message=JSON.stringify((error as GronaError).toJSON());
      expect(message).not.toContain('embed-secret'); expect(message).not.toContain('mobile-secret'); expect(message).not.toContain('linksecret'); expect(message).not.toContain('gro_ed_key_secret');
    }
  });
  it('times out with normalized error and aborts fetch',async()=>{
    const fetcher=vi.fn((_url:unknown,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('Aborted')))));
    const client=new GronaClient(loadConfig({GRONA_API_KEY:'key',GRONA_TIMEOUT_MS:'5',GRONA_MAX_RETRIES:'0'}),{fetch:fetcher as typeof fetch});
    await expect(client.listCampaigns()).rejects.toMatchObject({code:'timeout',retryable:true});
  });
  it('keeps the timeout active while reading a stalled response body',async()=>{
    const fetcher=vi.fn(async (_url:unknown,init?:RequestInit)=>new Response(new ReadableStream({
      start(controller){init?.signal?.addEventListener('abort',()=>controller.error(new DOMException('Aborted','AbortError')));},
    })));
    const client=new GronaClient(loadConfig({GRONA_API_KEY:'key',GRONA_TIMEOUT_MS:'5',GRONA_MAX_RETRIES:'0'}),{fetch:fetcher as typeof fetch});
    await expect(client.listCampaigns()).rejects.toMatchObject({code:'timeout'});
  });
  it('uses the larger verification timeout',async()=>{
    const fetcher=vi.fn((_url:unknown,init?:RequestInit)=>new Promise<Response>((resolve,reject)=>{
      const timer=setTimeout(()=>resolve(json(envelope({url:create.url,script:{status:'present',checkedAt:'now'}}))),20);
      init?.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('Aborted'));});
    }));
    const client=new GronaClient(loadConfig({GRONA_API_KEY:'key',GRONA_TIMEOUT_MS:'1',GRONA_VERIFY_TIMEOUT_MS:'100',GRONA_MAX_RETRIES:'0'}),{fetch:fetcher as typeof fetch});
    expect((await client.verifyScript(create.url)).data.script.status).toBe('present');
  });
  it('parses Retry-After safely',()=>{
    expect(parseRetryAfter('2')).toBe(2000); expect(parseRetryAfter('1.5')).toBe(1500);
    expect(parseRetryAfter('Thu, 12 Nov 2026 12:00:00 GMT',Date.parse('2026-11-12T11:59:58Z'))).toBe(2000);
    expect(parseRetryAfter('not-a-time')).toBeUndefined(); expect(parseRetryAfter(null)).toBeUndefined();
  });
});
