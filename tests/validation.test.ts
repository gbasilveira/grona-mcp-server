import { describe, expect, it, vi } from 'vitest';
import { createCampaignSchema, updateCampaignSchema, editLinkSchema, segmentIdSchema, externalIdSchema, customerIdSchema, httpUrlSchema } from '../src/schemas.js';
import { loadConfig } from '../src/config.js';
import { GronaClient } from '../src/client.js';
const base={name:'Campaign',url:'https://shop.example.com/dairy/milk',segmentId:'audience_id',segmentValue:'buyer'};

describe('request contracts',()=>{
  it('validates defaults without adding undocumented request fields',()=>expect(createCampaignSchema.parse(base)).toEqual(base));
  it('accepts A/B and multi-page rules with role traffic split',()=>{
    const input={...base,type:'abTest',pageTargeting:'multiple',slug:'dairy',list:[' dairy ','bakery','dairy'],trafficSplit:{Control:60,Test:40}};
    expect(createCampaignSchema.parse(input)).toEqual({...input,list:['dairy','bakery']});
  });
  it.each([
    {name:''},{url:'file:///etc/passwd'},{url:'not-a-url'},{segmentId:'location'},{segmentId:'0bad'},{segmentValue:'contains spaces'},
    {externalId:'bad id'},{trafficSplit:{Control:50,Test:50}},{type:'abTest',trafficSplit:{Control:40,Test:40}},
    {type:'abTest',trafficSplit:{Control:50.5,Test:49.5}},{type:'abTest',trafficSplit:{Control:101,Test:-1}},
    {pageTargeting:'multiple'},{pageTargeting:'multiple',slug:'missing',list:['dairy']},
    {pageTargeting:'multiple',slug:'dairy',list:[]},{pageTargeting:'multiple',slug:'dairy',list:Array(51).fill('dairy')},
    {pageTargeting:'multiple',slug:'dairy',list:[' ']},{slug:'dairy'},{condition:'included'},{list:['dairy']},
    {pageTargeting:'multiple',url:'https://shop.example.com/dairy/a%3Bb',slug:'dairy',list:['dairy']},
    {pageTargeting:'multiple',url:'https://shop.example.com/dairy\\milk',slug:'dairy',list:['dairy']},
  ])('rejects invalid campaign combination %j',delta=>expect(createCampaignSchema.safeParse({...base,...delta}).success).toBe(false));
  it('limits page list element length',()=>expect(createCampaignSchema.safeParse({...base,pageTargeting:'multiple',slug:'dairy',list:['x'.repeat(201)]}).success).toBe(false));
  it.each([{}, {url:base.url}, {pageTargeting:'multiple'}, {trafficSplit:{one:20,two:20}}, {segmentId:null}, {segmentValue:''}])('rejects invalid update %j',input=>expect(updateCampaignSchema.safeParse(input).success).toBe(false));
  it('allows clearing externalId, partial targeting, full id splits and ignored type',()=>{
    expect(updateCampaignSchema.parse({externalId:null,segmentValue:'new',trafficSplit:{v1:0,v2:100},type:'unchangeable'})).toEqual({externalId:null,segmentValue:'new',trafficSplit:{v1:0,v2:100},type:'unchangeable'});
  });
  it('requires an editor selector and accepts both with variationId precedence upstream',()=>{
    expect(editLinkSchema.safeParse({}).success).toBe(false);
    expect(editLinkSchema.parse({variationId:'opaque',url:base.url})).toEqual({variationId:'opaque',url:base.url});
  });
  it('treats identifiers as opaque and checks declared lengths/characters',()=>{
    expect(externalIdSchema.safeParse('x'.repeat(128)).success).toBe(true);
    expect(externalIdSchema.safeParse('x'.repeat(129)).success).toBe(false);
    expect(segmentIdSchema.safeParse('x'.repeat(128)).success).toBe(true);
    expect(segmentIdSchema.safeParse('x'.repeat(129)).success).toBe(false);
    expect(customerIdSchema.safeParse('email@example.com').success).toBe(false);
    expect(customerIdSchema.safeParse('cus_1:abc-2').success).toBe(true);
    expect(httpUrlSchema.safeParse('https://user:pass@example.com/').success).toBe(false);
  });
  it('fails invalid requests before a network call',async()=>{
    const fetcher=vi.fn(); const client=new GronaClient(loadConfig({GRONA_API_KEY:'key'}),{fetch:fetcher});
    await expect(client.createCampaign({...base,type:'general',trafficSplit:{Control:50,Test:50}})).rejects.toMatchObject({code:'invalid_request',status:400});
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('configuration',()=>{
  it('provides defaults while keeping credentials optional',()=>expect(loadConfig({})).toMatchObject({authMode:'bearer',timeoutMs:30000,verifyTimeoutMs:90000,maxRetries:2,maxRetryDelayMs:60000}));
  it.each([
    {GRONA_AUTH_MODE:'invalid'},{GRONA_TIMEOUT_MS:'0'},{GRONA_MAX_RETRIES:'-1'},{GRONA_TIMEOUT_MS:'1e3'},
    {GRONA_BASE_URL:'http://untrusted.example.com'},{GRONA_BASE_URL:'https://user:password@example.com/'},
    {GRONA_BASE_URL:'https://example.com/?token=secret'},{GRONA_API_KEY:'key\nBad: value'},
  ])('rejects invalid config without disclosing secrets %j',env=>{
    expect(()=>loadConfig(env)).toThrow('Invalid Grona configuration');
    try{loadConfig(env);}catch(error){expect((error as Error).message).not.toContain('password');expect((error as Error).message).not.toContain('token=secret');}
  });
  it('trims credentials and treats whitespace-only values as unconfigured',()=>{
    expect(loadConfig({GRONA_API_KEY:'   ',GRONA_MOBILE_API_KEY:' mobile-secret ' })).toMatchObject({apiKey:undefined,mobileApiKey:'mobile-secret'});
  });
  it('accepts deliberate local test endpoints and strips trailing slash',()=>expect(loadConfig({GRONA_BASE_URL:'http://127.0.0.1:1234/api/'}).baseUrl).toBe('http://127.0.0.1:1234/api'));
});
