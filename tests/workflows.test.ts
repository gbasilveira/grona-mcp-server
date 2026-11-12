import { describe, it, expect, vi } from 'vitest';
import type { Campaign } from '../src/types.js';
import { GronaError } from '../src/client.js';
import { abSplitSchema, checkReadiness, createCampaignOnce, evaluatePageTargeting, generateSnippet, launchCampaign, searchCampaigns, searchCampaignsSchema, setAbSplit, targetingSchema, type WorkflowClient } from '../src/workflows.js';
import { campaign, fakeClient } from './server-fixtures.js';
const envelope = <T>(data: T) => ({ data, meta:{workspaceId:'workspace-1'} });
const request = {name:'Breakfast',externalId:'CMP-1',url:'https://shop.example.com/products',segmentId:'audience_id',segmentValue:'returning'};
describe('launch workflows', () => {
  it('verifies actual preview-derived campaign page and publishes immutable id', async () => {
    const client = fakeClient(); const result = await launchCampaign(client, {campaignId:'CMP-1',edited:true,previewed:true});
    expect(client.verifyScript).toHaveBeenCalledWith('https://shop.example.com/products');
    expect(client.setCampaignStatus).toHaveBeenCalledWith('campaign-grona-id','live'); expect(result.completedSteps).toEqual(['read_campaign','verify_campaign_page','set_live']);
  });
  it('refuses absent snippet even when campaign stored snippet state says present', async () => {
    const client = fakeClient(); client.verifyScript.mockResolvedValue(envelope({url:request.url,script:{status:'absent',checkedAt:'now'}}));
    await expect(launchCampaign(client,{campaignId:'CMP-1',edited:true,previewed:true})).rejects.toMatchObject({code:'not_ready'});
    expect(client.setCampaignStatus).not.toHaveBeenCalled();
  });
  it('requires edit/preview attestations before any network request', async () => {
    const client = fakeClient();
    await expect(launchCampaign(client, {campaignId:'CMP-1',edited:false,previewed:true} as never)).rejects.toThrow(); expect(client.getCampaign).not.toHaveBeenCalled();
  });
  it('refuses missing variations and does not accept unrelated caller url', async () => {
    const client = fakeClient(campaign({variations:[]})); const readiness = await checkReadiness(client,'CMP-1');
    expect(readiness.data.ready).toBe(false); expect(client.verifyScript).not.toHaveBeenCalled();
    await expect(launchCampaign(client,{campaignId:'CMP-1',edited:true,previewed:true,url:'https://other.example'} as never)).rejects.toThrow();
  });
  it('uses stored multi-page sample URL rather than preview URL', async () => {
    const client = fakeClient(campaign({pageTargeting:'multiple',url:'https://shop.example.com/dairy/milk'}));
    await checkReadiness(client,'CMP-1'); expect(client.verifyScript).toHaveBeenCalledWith('https://shop.example.com/dairy/milk');
  });
  it('reports completed steps and uncertain status after failed publish request', async () => {
    const client = fakeClient(); client.setCampaignStatus.mockRejectedValue(new Error('token=secret'));
    await expect(launchCampaign(client,{campaignId:'CMP-1',edited:true,previewed:true})).rejects.toMatchObject({code:'launch_outcome_uncertain',details:{campaignId:'campaign-grona-id',completedSteps:['read_campaign','verify_campaign_page'],attemptedStep:'set_live'}});
  });
  it('does not launch unknown future campaign types', async () => {
    const client = fakeClient(campaign({type:'future'})); expect((await checkReadiness(client,'CMP-1')).data.ready).toBe(false);
  });
});
describe('create-once', () => {
  it('returns new paused campaign without redundant lookups or link minting', async () => {
    const client = fakeClient(); const result = await createCampaignOnce(client,request); expect(result.recovered).toBe(false); expect(client.getCampaign).not.toHaveBeenCalled();
  });
  it('recovers matching externalId conflict with fresh variation links', async () => {
    const client = fakeClient(); client.createCampaign.mockRejectedValue(new GronaError('conflict','taken',409));
    const result = await createCampaignOnce(client,request); expect(result.recovered).toBe(true); expect(client.getCampaign).toHaveBeenCalledWith('CMP-1'); expect(client.createEditLink).toHaveBeenCalledWith({variationId:'v1'}); expect(client.updateCampaign).not.toHaveBeenCalled();
  });
  it('rejects conflict reused for another intent without mutating or minting links', async () => {
    const client = fakeClient(campaign({name:'Another name'})); client.createCampaign.mockRejectedValue(new GronaError('conflict','taken',409));
    await expect(createCampaignOnce(client,request)).rejects.toMatchObject({code:'create_conflict_mismatch',details:{mismatches:['name']}}); expect(client.createEditLink).not.toHaveBeenCalled(); expect(client.updateCampaign).not.toHaveBeenCalled();
  });
  it('requires externalId and propagates non-conflict upstream errors', async () => {
    const client = fakeClient(); await expect(createCampaignOnce(client,{...request,externalId:undefined})).rejects.toMatchObject({code:'invalid_request'});
    client.createCampaign.mockRejectedValue(new GronaError('unauthorized','bad key',401)); await expect(createCampaignOnce(client,request)).rejects.toMatchObject({status:401});
  });
  it('refuses unverifiable specific A/B original query identity', async () => {
    const c = campaign({type:'abTest',trafficSplit:{v1:50,v2:50},variations:[{id:'v1',name:'Control',type:'control',previewUrl:request.url},{id:'v2',name:'Test',type:'variant',previewUrl:request.url}]});
    const client = fakeClient(c); client.createCampaign.mockRejectedValue(new GronaError('conflict','taken',409));
    await expect(createCampaignOnce(client,{...request,type:'abTest',url:request.url+'?source=1'})).rejects.toMatchObject({code:'create_conflict_mismatch'});
  });
  it('reports existing campaign and completed steps when refresh partially fails', async () => {
    const client = fakeClient(); client.createCampaign.mockRejectedValue(new GronaError('conflict','taken',409)); client.createEditLink.mockRejectedValue(new Error('sensitive'));
    await expect(createCampaignOnce(client,request)).rejects.toMatchObject({code:'partial_workflow',details:{campaignId:'campaign-grona-id',failedVariationId:'v1',completedSteps:['create_conflict','read_existing_campaign','compare_creation_identity']}});
  });
});
describe('A/B role split', () => {
  it('maps by semantic role even if variation order changes', async () => {
    const client = fakeClient(campaign({type:'abTest',variations:[{id:'test-id',type:'variant',name:'Test',previewUrl:request.url},{id:'control-id',type:'control',name:'Control',previewUrl:request.url}]}));
    await setAbSplit(client,{campaignId:'CMP-1',Control:60,Test:40}); expect(client.updateCampaign).toHaveBeenCalledWith('campaign-grona-id',{trafficSplit:{'control-id':60,'test-id':40}});
  });
  it('rejects general campaigns, missing roles and incorrect totals', async () => {
    const client = fakeClient(); await expect(setAbSplit(client,{campaignId:'CMP-1',Control:50,Test:50})).rejects.toMatchObject({code:'invalid_campaign_type'});
    expect(abSplitSchema.safeParse({campaignId:'CMP-1',Control:70,Test:40}).success).toBe(false);
    client.getCampaign.mockResolvedValue(envelope(campaign({type:'abTest'}))); await expect(setAbSplit(client,{campaignId:'CMP-1',Control:50,Test:50})).rejects.toMatchObject({code:'invalid_variations'});
  });
});
describe('local targeting', () => {
  it('applies exclusion only inside exact origin and path-segment count', () => {
    const result = evaluatePageTargeting(targetingSchema.parse({url:'https://shop.example.com/dairy/milk',pageTargeting:'multiple',slug:'dairy',condition:'not_included',list:['dairy'],urls:['https://other.example/bakery/bread','https://shop.example.com/bakery/bread/extra','https://shop.example.com/bakery/bread','https://shop.example.com/dairy/milk']}));
    expect(result.data.map(v => v.pageMatches)).toEqual([false,false,true,false]);
  });
  it('compares case-sensitively and follows slug position', () => {
    const result = evaluatePageTargeting(targetingSchema.parse({url:'https://shop.example.com/store/dairy',pageTargeting:'multiple',slug:'dairy',list:['bakery'],urls:['https://shop.example.com/store/bakery','https://shop.example.com/store/Bakery','https://shop.example.com/bakery/store']}));
    expect(result.data.map(v=>v.pageMatches)).toEqual([true,false,false]);
  });
  it('keeps queries for specific A/B and ignores them for general', () => {
    const base = {url:'https://shop.example.com/products?source=1',urls:['https://shop.example.com/products?source=2']};
    expect(evaluatePageTargeting(targetingSchema.parse({...base,type:'abTest'})).data[0]?.eligible).toBe(false);
    expect(evaluatePageTargeting(targetingSchema.parse(base)).data[0]?.eligible).toBe(true);
  });
  it('marks eligibility unknown until supplied page variable is available', () => {
    const base = {url:request.url,urls:[request.url],segmentId:'audience_id',segmentValue:'returning'};
    expect(evaluatePageTargeting(targetingSchema.parse(base)).data[0]?.eligible).toBe(null);
    expect(evaluatePageTargeting(targetingSchema.parse({...base,pageVariables:{audience_id:'new'}})).data[0]?.eligible).toBe(false);
    expect(evaluatePageTargeting(targetingSchema.parse({...base,pageVariables:{audience_id:'returning'}})).data[0]?.eligible).toBe(true);
  });
  it('invalid URLs produce validation issues without throwing URL constructor errors', () => {
    expect(()=>targetingSchema.safeParse({url:'bad',pageTargeting:'multiple',slug:'dairy',list:['dairy'],urls:[request.url]})).not.toThrow();
    expect(targetingSchema.safeParse({url:'bad',pageTargeting:'multiple',slug:'dairy',list:['dairy'],urls:[request.url]}).success).toBe(false);
  });
});
describe('search and snippets', () => {
  it('filters then sorts with deterministic id ties before local slicing', async () => {
    const client = fakeClient(); client.listCampaigns.mockResolvedValue(envelope([campaign({id:'b'}),campaign({id:'a'}),campaign({id:'c',status:'live'})]));
    const result = await searchCampaigns(client,searchCampaignsSchema.parse({query:'BREAK',status:'paused',limit:1,offset:1}));
    expect(result.data.map(v=>v.id)).toEqual(['b']); expect(result.meta).toMatchObject({upstreamCount:3,matchedCount:2,count:1,localPagination:true});
  });
  it('generates Embed HTML with safe variable names and rejects script injection', () => {
    const result = generateSnippet({workspaceId:'workspace-1',segmentId:'audience_id',segmentValue:'returning'});
    expect(result.data.html).toContain('data-grona-embed-script="workspace-1"'); expect(result.data.html).toContain('window["audience_id"] = "returning"');
    expect(()=>generateSnippet({workspaceId:'"><script>alert(1)</script>'})).toThrow();
    expect(()=>generateSnippet({workspaceId:'w',segmentId:'foo',segmentValue:'</script><script>'})).toThrow();
  });
});
