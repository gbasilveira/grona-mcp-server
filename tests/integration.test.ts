import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer as createHttpServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { parse } from 'yaml';
import { TOOL_CATALOG } from '../src/catalog.js';

const campaign = {
  id:'campaign-1', externalId:'CMP-1', name:'Campaign', status:'paused',
  domain:'https://shop.example.com',script:{status:'present',checkedAt:'2026-11-12T10:00:00.000Z'},
  type:'general',pageTargeting:'specific',segmentId:'audience_id',segmentValue:'buyer',
  createdAt:'2026-11-12T10:00:00.000Z',updatedAt:'2026-11-12T10:00:00.000Z',
  variations:[{id:'variation-1',name:'Variation',type:'variant',previewUrl:'https://shop.example.com/?preview=1'}],
  futureField:{kept:true},
};
const meta={workspaceId:'workspace-1'};
type RequestRecord={path:string;method:string;authorization?:string;xApiKey?:string;body:any};
const requests:RequestRecord[]=[];
let http:Server;
let sdk:Client;
let transport:StdioClientTransport;
let stderr='';

describe('actual stdio CLI and HTTP contract',()=>{
  beforeAll(async()=>{
    http=createHttpServer(async(req,res)=>{
      const chunks:Buffer[]=[];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body=chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
      const path=req.url!;
      requests.push({path,method:req.method!,authorization:req.headers.authorization,xApiKey:req.headers['x-api-key'] as string|undefined,body});
      res.setHeader('Content-Type','application/json');
      if(path.includes('missing')) {res.statusCode=404;res.end(JSON.stringify({error:{code:'not_found',message:'Campaign missing'}}));return;}
      let data:unknown=campaign;
      if(path==='/embed/campaigns' && req.method==='GET') data=[campaign];
      if(path.endsWith('/status')) data={status:body.status};
      if(req.method==='DELETE') data={id:campaign.id,deletedVariationIds:['variation-1']};
      if(path.endsWith('/edit-link')) data={variationId:'variation-1',editUrl:'https://services.grona.ai/editor?token=example',previewUrl:campaign.variations[0]!.previewUrl,generatedAt:'2026-11-12T10:00:00.000Z',expiresAt:'2026-11-12T10:15:00.000Z'};
      if(path.endsWith('/validate')) data={valid:false,refreshed:true,variationId:'variation-1',editUrl:'https://services.grona.ai/editor?token=refreshed',generatedAt:'2026-11-12T10:00:00.000Z',expiresAt:'2026-11-12T10:15:00.000Z'};
      if(path.endsWith('/verify-script')) data={url:body.url,script:{status:'present',checkedAt:'2026-11-12T10:00:00.000Z'}};
      if(path==='/v1/mobile/grants') data={grants:['opaque-grant-token']};
      if(path==='/embed/campaigns' && req.method==='POST') res.statusCode=201;
      res.end(JSON.stringify({data,meta:{...meta,...(Array.isArray(data)?{count:data.length}:{})}}));
    });
    await new Promise<void>(r=>http.listen(0,'127.0.0.1',r));
    const address=http.address();
    if(!address || typeof address==='string') throw new Error('No local HTTP listener');
    const origin=`http://127.0.0.1:${address.port}`;
    const entry=process.env.GRONA_TEST_ENTRY ?? 'src/index.ts';
    transport=new StdioClientTransport({command:process.execPath,args:entry.endsWith('.ts') ? ['--import','tsx',resolve(entry)] : [resolve(entry)],
      cwd:process.cwd(),env:{GRONA_API_KEY:'embed-test-secret',GRONA_MOBILE_API_KEY:'mobile-test-secret',
        GRONA_BASE_URL:`${origin}/embed`,GRONA_MOBILE_BASE_URL:origin,GRONA_MAX_RETRIES:'0'},stderr:'pipe'});
    transport.stderr?.on('data',(chunk)=>{stderr+=String(chunk);});
    sdk=new Client({name:'grona-integration',version:'1.0.0'});
    await sdk.connect(transport);
  },30000);
  afterAll(async()=>{await sdk?.close();await new Promise<void>(r=>http?.close(()=>r()));});

  it('maps every captured upstream operation to one discoverable tool',async()=>{
    const spec=parse(readFileSync('docs/upstream/grona-api.yaml','utf8'));
    const api=TOOL_CATALOG.filter(t=>t.kind==='api');
    const operations=[];
    for(const [path,item] of Object.entries(spec.paths) as [string,Record<string,any>][]) {
      for(const method of ['get','post','patch','delete']) if(item[method]) operations.push({path,method:method.toUpperCase(),operationId:item[method].operationId});
    }
    expect(operations).toHaveLength(10);
    expect(api).toHaveLength(operations.length);
    for(const op of operations) expect(api).toEqual(expect.arrayContaining([expect.objectContaining(op)]));
    const listed=await sdk.listTools();
    expect(new Set(listed.tools.map(t=>t.name))).toEqual(new Set(TOOL_CATALOG.map(t=>t.name)));
    for(const tool of listed.tools) {expect(tool.inputSchema.type).toBe('object');expect(tool.description).toBeTruthy();expect(tool.annotations).toBeDefined();}
  });

  it.each([
    ['grona_list_campaigns',{},'GET','/embed/campaigns',undefined],
    ['grona_create_campaign',{name:'Campaign',url:'https://shop.example.com/',segmentId:'audience_id',segmentValue:'buyer',externalId:'CMP-1'},'POST','/embed/campaigns',{name:'Campaign',url:'https://shop.example.com/',segmentId:'audience_id',segmentValue:'buyer',externalId:'CMP-1'}],
    ['grona_get_campaign',{campaignId:'CMP-1'},'GET','/embed/campaigns/CMP-1',undefined],
    ['grona_update_campaign',{campaignId:'campaign-1',changes:{externalId:null,name:'Renamed'}},'PATCH','/embed/campaigns/campaign-1',{externalId:null,name:'Renamed'}],
    ['grona_delete_campaign',{campaignId:'campaign-1'},'DELETE','/embed/campaigns/campaign-1',undefined],
    ['grona_set_campaign_status',{campaignId:'campaign-1',status:'live'},'PATCH','/embed/campaigns/campaign-1/status',{status:'live'}],
    ['grona_create_edit_link',{variationId:'variation-1'},'POST','/embed/variations/edit-link',{variationId:'variation-1'}],
    ['grona_validate_edit_link',{editUrl:'https://services.grona.ai/editor?token=example'},'POST','/embed/variations/edit-link/validate',{editUrl:'https://services.grona.ai/editor?token=example'}],
    ['grona_verify_script',{url:'https://shop.example.com/'},'POST','/embed/websites/verify-script',{url:'https://shop.example.com/'}],
    ['grona_issue_grants',{customerId:'cus_opaque'},'POST','/v1/mobile/grants',{customerId:'cus_opaque'}],
  ] as const)('executes %s through MCP to its exact HTTP route',async(name,args,method,path,body)=>{
    const start=requests.length;
    const result=await sdk.callTool({name,arguments:args});
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toHaveProperty('data');
    expect(result.structuredContent).toHaveProperty('meta.workspaceId','workspace-1');
    const request=requests.slice(start).find(r=>r.method===method && r.path===path);
    expect(request).toBeDefined();
    expect(request!.body).toEqual(body);
    expect(request!.authorization).toBe(`Bearer ${name==='grona_issue_grants'?'mobile':'embed'}-test-secret`);
    expect(request!.xApiKey).toBeUndefined();
  });

  it('preserves extra response fields and returns actionable API failures',async()=>{
    const success=await sdk.callTool({name:'grona_get_campaign',arguments:{campaignId:'campaign-1'}});
    expect(success.structuredContent).toHaveProperty('data.futureField.kept',true);
    const error=await sdk.callTool({name:'grona_get_campaign',arguments:{campaignId:'missing'}});
    expect(error.isError).toBe(true);
    expect(error.structuredContent).toHaveProperty('error.code','not_found');
    expect(JSON.stringify(error)).not.toContain('embed-test-secret');
  });

  it('reads all static resources and instantiates all reusable prompts',async()=>{
    const {resources}=await sdk.listResources();
    expect(resources.length).toBeGreaterThanOrEqual(2);
    for(const resource of resources) {
      const result=await sdk.readResource({uri:resource.uri});
      expect(result.contents.length).toBeGreaterThan(0);
    }
    const {prompts}=await sdk.listPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    for(const prompt of prompts) {
      const args=Object.fromEntries((prompt.arguments??[]).map(arg=>[arg.name,arg.name.toLowerCase().includes('url')?'https://shop.example.com/':'example']));
      const result=await sdk.getPrompt({name:prompt.name,arguments:args});
      expect(result.messages.length).toBeGreaterThan(0);
    }
  });

  it('rejects invalid MCP inputs before sending network traffic',async()=>{
    const count=requests.length;
    try {
      const response=await sdk.callTool({name:'grona_create_campaign',arguments:{name:'No targeting'}});
      expect(response.isError).toBe(true);
    } catch(error) {expect(String(error)).toMatch(/invalid|validation|required/i);}
    expect(requests.length).toBe(count);
    expect(stderr).not.toContain('embed-test-secret');
    expect(stderr).not.toContain('mobile-test-secret');
  });
});

describe('offline startup',()=>{
  it('discovers and uses local capabilities without any credentials',async()=>{
    const entry=process.env.GRONA_TEST_ENTRY ?? 'src/index.ts';
    const offlineTransport=new StdioClientTransport({command:process.execPath,args:entry.endsWith('.ts') ? ['--import','tsx',resolve(entry)] : [resolve(entry)],cwd:process.cwd(),env:{},stderr:'pipe'});
    const offline=new Client({name:'offline-integration',version:'1.0.0'});
    try {
      await offline.connect(offlineTransport);
      const config=await offline.callTool({name:'grona_configuration',arguments:{}});
      expect(config.structuredContent).toHaveProperty('data.embedCredentialConfigured',false);
      expect(config.structuredContent).toHaveProperty('data.mobileCredentialConfigured',false);
      const snippet=await offline.callTool({name:'grona_generate_snippet',arguments:{workspaceId:'workspace_1'}});
      expect(snippet.isError).not.toBe(true);
      expect(snippet.structuredContent).toHaveProperty('data.html');
      const missing=await offline.callTool({name:'grona_list_campaigns',arguments:{}});
      expect(missing.isError).toBe(true);
      expect(missing.structuredContent).toHaveProperty('error.code','missing_credentials');
    } finally {await offline.close();}
  },30000);
});
