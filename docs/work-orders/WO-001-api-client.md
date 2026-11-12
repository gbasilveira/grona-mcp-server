# WO-001 — Typed API client and validation

| | |
|---|---|
| Phase | P1 |
| Status | READY |
| Depends on | — |
| Branch | `wo/001-client` |

## PREPARATION

Repository `/home/gbas/trabalho/gbasilveira/grona-mcp`; worktree `/tmp/grona-mcp-wo-001`.
Node 22.23.1, npm 10.9.8 verified. Root installs locked dependencies; symlink root node_modules.
No secrets needed. Read `docs/upstream/grona-api.yaml`, convention/error guides and orchestration §3.
Smoke: `node --version`. Verify `npm run typecheck` (server may not yet exist), `npm test -- tests/client.test.ts tests/validation.test.ts`.

## Objective and tasks

- [ ] Implement `src/types.ts`, `src/schemas.ts`, `src/config.ts`, `src/client.ts` and focused tests.
- [ ] Cover all 10 routes; exact original envelopes; separate Embed/mobile credentials and hosts.
- [ ] Validate every request field and cross-field rules; export Zod request schemas for MCP.
- [ ] Safe bounded retries, Retry-After seconds/date, timeout, network/gateway/envelope errors and redaction.

## Shared interface (coordinate changes with server executor)

Export `GronaClient` with constructor `(config: GronaConfig, options?: {fetch?: typeof fetch; sleep?: (ms:number)=>Promise<void>; random?:()=>number})`.
Methods: `listCampaigns()`, `createCampaign(body: CreateCampaignRequest)`, `getCampaign(campaignId:string)`,
`updateCampaign(campaignId:string, body:UpdateCampaignRequest)`, `deleteCampaign(campaignId:string)`,
`setCampaignStatus(campaignId:string,status:'live'|'paused')`, `createEditLink(body:{variationId?:string;url?:string})`,
`validateEditLink(editUrl:string)`, `verifyScript(url:string)`, `issueGrants(customerId:string)`.
All return Promise of typed `{data,meta}` preserving extension fields.
`GronaError` exposes `code,status,message,retryAfterMs?,retryable` and `toJSON()` with actionable recovery.
Config `loadConfig(env=process.env)` returns `GronaConfig` with `apiKey?,mobileApiKey?,baseUrl,mobileBaseUrl,authMode:'bearer'|'header',timeoutMs,verifyTimeoutMs,maxRetries,maxRetryDelayMs`.
Credentials checked at call time, enabling offline helper tools. Environment names `GRONA_API_KEY`, `GRONA_MOBILE_API_KEY`, `GRONA_BASE_URL`, `GRONA_MOBILE_BASE_URL`, `GRONA_AUTH_MODE`, `GRONA_TIMEOUT_MS`, `GRONA_VERIFY_TIMEOUT_MS`, `GRONA_MAX_RETRIES`, `GRONA_MAX_RETRY_DELAY_MS`.
Export schemas `createCampaignSchema`, `updateCampaignSchema`, `editLinkSchema`, `httpUrlSchema`, `externalIdSchema`, `segmentIdSchema`, `segmentValueSchema`, `customerIdSchema`.
Types `Campaign`, `Variation`, `CreateCampaignRequest`, `UpdateCampaignRequest`, `Envelope<T>`, `GronaConfig` accessible from types/config.
Retry only documented safe operations: reads, link operations, verify, mobile, create with externalId; mutations must resolve externalId to immutable id before retry (or never auto-retry mutations). Create without externalId never replay automatically. Do not follow redirects with credentials. Reject malformed success envelopes, tolerate future enum/extra response fields.

## Out of scope

No server/workflows/index/docs changes beyond this WO RESULT; no package/lock edits. Never contact authenticated production routes.

## Acceptance and sabotage

Tests exercise every HTTP route, encoding/auth, no duplicate unsafe create, externalId mutation retry protection, 429/date/5xx/network/timeout, both hosts, invalid schema/cross-field cases. Show tests fail when credential isolation or create retry safeguard is sabotaged; restore files.

## RESULT

Pending.
