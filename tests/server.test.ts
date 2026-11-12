import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createServer, TOOL_SCHEMAS } from '../src/server.js';
import { TOOL_CATALOG, RESOURCE_CATALOG, PROMPT_CATALOG } from '../src/catalog.js';
import { GronaClient, GronaError } from '../src/client.js';
import { loadConfig } from '../src/config.js';
import { campaign, fakeClient } from './server-fixtures.js';
const cleanups: (()=>Promise<void>)[] = [];
afterEach(async()=>{for(const close of cleanups.splice(0)) await close();});
async function setup() {
  const c = Object.assign(fakeClient(),{config:loadConfig({GRONA_API_KEY:'embed-secret',GRONA_MOBILE_API_KEY:'mobile-secret'}),deleteCampaign:vi.fn().mockResolvedValue({data:{id:'campaign-grona-id',deletedVariationIds:['v1']},meta:{workspaceId:'w'}}),validateEditLink:vi.fn().mockResolvedValue({data:{valid:false,refreshed:true,editUrl:'https://services.grona.ai/edit?token=secret'},meta:{workspaceId:'w'}}),issueGrants:vi.fn().mockResolvedValue({data:{grants:['signed-token']},meta:{workspaceId:'w'}})});
  const server = createServer(c as unknown as GronaClient); const client = new Client({name:'test',version:'1'}); const [a,b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b); cleanups.push(async()=>{await client.close();await server.close();}); return {client,c,server};
}
describe('MCP discovery and direct routes',()=>{
  it('advertises all tools with structured input/output schemas and annotations',async()=>{
    const {client} = await setup(); const {tools} = await client.listTools(); expect(tools.map(t=>t.name).sort()).toEqual(TOOL_CATALOG.map(t=>t.name).sort());
    for(const tool of tools){ expect(tool.inputSchema.type).toBe('object');expect(tool.outputSchema).toBeDefined();expect(tool.annotations).toHaveProperty('readOnlyHint'); }
    expect(tools.find(t=>t.name==='grona_create_campaign')?.inputSchema.required).toEqual(expect.arrayContaining(['name','url','segmentId','segmentValue']));
  });
  it.each([
    ['grona_list_campaigns',{},'listCampaigns',[]],
    ['grona_create_campaign',{name:'Test',url:'https://shop.example.com',segmentId:'audience_id',segmentValue:'returning'},'createCampaign',[{name:'Test',url:'https://shop.example.com',segmentId:'audience_id',segmentValue:'returning'}]],
    ['grona_get_campaign',{campaignId:'CMP-1'},'getCampaign',['CMP-1']],
    ['grona_update_campaign',{campaignId:'CMP-1',changes:{externalId:null}},'updateCampaign',['CMP-1',{externalId:null}]],
    ['grona_delete_campaign',{campaignId:'CMP-1'},'deleteCampaign',['CMP-1']],
    ['grona_set_campaign_status',{campaignId:'CMP-1',status:'paused'},'setCampaignStatus',['CMP-1','paused']],
    ['grona_create_edit_link',{variationId:'v1'},'createEditLink',[{variationId:'v1'}]],
    ['grona_validate_edit_link',{editUrl:'https://services.grona.ai/edit?token=secret'},'validateEditLink',['https://services.grona.ai/edit?token=secret']],
    ['grona_verify_script',{url:'https://shop.example.com'},'verifyScript',['https://shop.example.com']],
    ['grona_issue_grants',{customerId:'cus_123'},'issueGrants',['cus_123']],
  ] as const)('%s calls exact client operation',async(name,args,method,expected)=>{
    const {client,c}=await setup();const response=await client.callTool({name,arguments:args});expect(response.isError).not.toBe(true);expect(response.structuredContent).toHaveProperty('data');expect(c[method]).toHaveBeenCalledWith(...expected);
  });
  it('serializes upstream errors with code/status/recovery and isError',async()=>{
    const {client,c}=await setup();c.getCampaign.mockRejectedValue(new GronaError('not_found','missing',404));const response=await client.callTool({name:'grona_get_campaign',arguments:{campaignId:'missing'}});
    expect(response.isError).toBe(true);expect(response.structuredContent).toMatchObject({error:{code:'not_found',status:404,recovery:expect.any(String)}});
  });
  it('rejects invalid input before network calls',async()=>{
    const {client,c}=await setup();const response=await client.callTool({name:'grona_create_campaign',arguments:{name:'missing fields'}});expect(response.isError).toBe(true);expect(c.createCampaign).not.toHaveBeenCalled();
  });
  it('hides unexpected error messages',async()=>{
    const {client,c}=await setup();c.getCampaign.mockRejectedValue(new Error('embed-secret token=secret'));const response=await client.callTool({name:'grona_get_campaign',arguments:{campaignId:'c'}});expect(JSON.stringify(response)).not.toContain('embed-secret');expect(JSON.stringify(response)).not.toContain('token=secret');
  });
  it('exposes credential presence only and offline helpers without credentials',async()=>{
    const {client}=await setup();const response=await client.callTool({name:'grona_configuration',arguments:{}});expect(response.structuredContent).toMatchObject({data:{embedCredentialConfigured:true,mobileCredentialConfigured:true}});expect(JSON.stringify(response)).not.toContain('embed-secret');expect(JSON.stringify(response)).not.toContain('mobile-secret');
  });
  it('normalizes multi-page list input without breaking JSON schema advertisement',async()=>{
    const {client,c}=await setup();await client.callTool({name:'grona_create_campaign',arguments:{name:'Test',url:'https://shop.example.com/dairy/milk',segmentId:'audience_id',segmentValue:'returning',pageTargeting:'multiple',slug:'dairy',list:[' dairy ','dairy','bakery']}});expect(c.createCampaign).toHaveBeenCalledWith(expect.objectContaining({list:['dairy','bakery']}));
  });
  it('serves all resources including authoritative OpenAPI',async()=>{
    const {client}=await setup();expect((await client.listResources()).resources.map(r=>r.uri).sort()).toEqual(RESOURCE_CATALOG.map(r=>r.uri).sort());
    for(const resource of RESOURCE_CATALOG){const read=await client.readResource({uri:resource.uri});expect(read.contents[0]).toHaveProperty('text');expect(String(read.contents[0] && 'text' in read.contents[0] ? read.contents[0].text : '')).not.toBe('');}
    expect((await client.readResource({uri:'grona://reference/openapi'})).contents[0]).toMatchObject({text:expect.stringContaining('openapi: 3.1.0')});
  });
  it('lists and renders every reusable prompt',async()=>{
    const {client}=await setup();expect((await client.listPrompts()).prompts.map(p=>p.name).sort()).toEqual(PROMPT_CATALOG.map(p=>p.name).sort());
    for(const prompt of PROMPT_CATALOG){const args: Record<string,string> | undefined=prompt.argument==='url'?{url:'https://shop.example.com'}:prompt.argument==='campaignId'?{campaignId:'CMP-1'}:undefined;const rendered=await client.getPrompt({name:prompt.name,arguments:args});expect(rendered.messages.length).toBe(1);}
  });
});
