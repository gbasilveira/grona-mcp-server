# WO-001 — Typed API client and validation

| | |
|---|---|
| Phase | P1 |
| Status | IN REVIEW |
| Depends on | — |
| Branch | `wo/001-client` |

## PREPARATION

Repository `/home/gbas/trabalho/gbasilveira/grona-mcp`; worktree `/tmp/grona-mcp-wo-001`.
Node 22.23.1, npm 10.9.8 verified. Root installs locked dependencies; symlink root node_modules.
No secrets needed. Read `docs/upstream/grona-api.yaml`, convention/error guides and orchestration §3.
Smoke: `node --version`. Verify `npm run typecheck` (server may not yet exist), `npm test -- tests/client.test.ts tests/validation.test.ts`.

## Objective and tasks

- [x] Implement `src/types.ts`, `src/schemas.ts`, `src/config.ts`, `src/client.ts` and focused tests.
- [x] Cover all 10 routes; exact original envelopes; separate Embed/mobile credentials and hosts.
- [x] Validate every request field and cross-field rules; export Zod request schemas for MCP.
- [x] Safe bounded retries, Retry-After seconds/date, timeout, network/gateway/envelope errors and redaction.

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

Implemented and ready for independent review.

- Branch: `wo/001-client`; base: `e9650e7`.
- New files: `src/types.ts`, `src/schemas.ts`, `src/config.ts`, `src/client.ts`,
  `tests/client.test.ts`, `tests/validation.test.ts`.
- All ten documented operations use their original route, method, fields and response
  envelope. Separate mobile credentials never fall back to Embed credentials.
- Responses preserve future enum values and extra fields. JSON/envelope shape checks
  reject malformed successes without leaking raw gateway bodies.
- Credentials checked on demand; config defaults support offline helper construction.
- Safe reads, link/verify/mobile calls and creates with externalId retry transient
  errors; PATCH/DELETE never automatically replay (including status changes).
  Retry-After supports seconds and HTTP dates; waits beyond configured budget return
  actionable errors rather than retrying too soon. Timeouts cover response body reads.
- Local validation covers declared field types, syntax, limits, nonempty patches,
  create applicability, split sums, page-list normalization, and multi-page URL/slug.
  Update applicability requiring existing campaign state remains enforced by Grona.
- Additional independent-review fixes: whitespace-only credentials become unconfigured;
  dot-only path ids fail locally with advice to list campaigns and use their Grona id;
  raw backslash paths are rejected before URL canonicalization can hide them.

Verification:

```text
npm run typecheck
> tsc --noEmit
(exit 0)

npm test -- tests/client.test.ts tests/validation.test.ts
Test Files  2 passed (2)
Tests       77 passed (77)
(exit 0)
```

Sabotage checks (restored before final verification):

1. Forced creates without externalId to retry: exit 1, expected unsafe-create test failed
   (1 failed / 31 passed in client suite).
2. Replaced mobile credential selector with Embed credential: exit 1, all-route isolation,
   header-mode isolation and missing-mobile-key tests failed (3 failed / 29 passed).

Deviations: none beyond explicitly permitted choice to never auto-retry mutations.
No live credentials or authenticated production requests were used. No source snapshot,
server, workflows, package or root documentation files were changed.

Follow-up: root runs integrated MCP protocol and packaging checks under WO-003.

