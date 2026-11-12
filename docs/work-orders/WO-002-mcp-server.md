# WO-002 — MCP tools and agent workflows

| | |
|---|---|
| Phase | P1 |
| Status | ACCEPTED |
| Depends on | WO-001 shared interface (implementation parallel) |
| Branch | `wo/002-server` |

## PREPARATION

Repository `/home/gbas/trabalho/gbasilveira/grona-mcp`; worktree `/tmp/grona-mcp-wo-002`.
Root installs dependencies; symlink root node_modules. Node 22.23.1 verified; no keys needed.
Read orchestration §3, WO-001 shared interface, `docs/upstream/grona-api.yaml` and guides.
Smoke `node --version`; SDK v2 installed in root node_modules, inspect types/examples for accurate API.
Verify `npm run typecheck` once integrated; focused tests executable against fake client.

## Tasks

- [x] Implement `src/server.ts`, `src/workflows.ts`, `src/catalog.ts`, `src/index.ts` with official MCP SDK v2 stdio server.
- [x] Register 10 direct tools, full schemas, precise annotations, structured results and actionable safe errors.
- [x] Implement useful inferred workflows: local search/filter/sort campaigns; idempotent create recovery with identity checks; campaign overview with preview links; live readiness with fresh snippet verification; safe launch requiring explicit edited/previewed attestations; role-based A/B split updates; page-targeting simulator; installation snippet generation.
- [x] Add static reference resources and reusable prompts, configuration diagnostics without secrets.
- [x] Meaningful focused tests for workflows and in-memory MCP protocol discovery/calls/errors/resources/prompts.

## Interface and naming

Follow WO-001 client interface. `createServer(client:GronaClient)` returns McpServer (allow options if useful).
10 names: `grona_list_campaigns`, `grona_create_campaign`, `grona_get_campaign`, `grona_update_campaign`, `grona_delete_campaign`, `grona_set_campaign_status`, `grona_create_edit_link`, `grona_validate_edit_link`, `grona_verify_script`, `grona_issue_grants`.
Direct update schema input `{campaignId,changes:UpdateCampaignRequest}`; status `{campaignId,status}`. Others align upstream names.
Helpers use `grona_` prefix. `catalog.ts` exports metadata for documentation generation with all tool names, descriptions, route mapping if applicable. Avoid embedding full upstream docs in prompt text.
No extra approval prompts in CLI. stdio stdout must remain JSON-RPC only. Signals close cleanly; credential errors safe.
Launch must use verified URL belonging to campaign (derive from stored multiple url or previewUrl stripped of query/fragment; specific has no url); never trust a caller-supplied unrelated verification URL. Readiness is advisory and cannot inspect edits/consent/CSP. Failure with partial side effects must report completed steps.
Page simulator follows exact origin, case, path segment count; excludes wrong origins even for excluded conditions. Snippet generation safely escapes HTML/script values. No JWT verification/redemption claims.

## Out of scope

Do not modify client/types/schemas/config, package files or root documentation. Only source files above, tests named server/workflows and this WO RESULT. Coordinate needed interface changes with client executor.

## Acceptance and sabotage

Prove all 10 tools discover and call correct client methods through SDK client; errors set isError; resources/prompts work. Helpers cover absent snippet, create conflict mismatch, targeting origin/count, A/B mapping. Sabotage launch verification or origin guard and show failing test; restore.

## RESULT

Branch `wo/002-server`; base `e9650e7`. Implementation completed in the bounded
server/catalog/workflows/index files and server/workflow tests. WO-001 dependencies
were symlinked only for local verification and are not included in this commit.

Files added: `src/catalog.ts`, `src/workflows.ts`, `src/server.ts`, `src/index.ts`,
`tests/server-fixtures.ts`, `tests/server.test.ts`, `tests/workflows.test.ts`.

Delivered 19 tools (10 direct operations, 6 workflow helpers, 3 local helpers),
4 reference resources and 3 reusable prompts. Every direct tool is exercised
through an actual SDK client/linked in-memory transport. Tools return JSON text
and structured content; upstream/workflow errors retain machine-readable codes.
The stdio entry uses the SDK v2 factory so modern and legacy protocol negotiation
are supported. Startup diagnostics report validated configuration messages only.

Launch uses a fresh verification of the page derived from the campaign itself,
requires edit/preview attestations, resolves to immutable Grona id and refuses
observable blockers. A failed launch mutation reports uncertainty and completed
checks. Create-once compares existing identity before refreshing links and reports
partial refresh failures without returning tokens in errors. Role-based A/B split
resolves variation ids, while local targeting retains origin/count restrictions.

Verification (2026-11-12):
```
npm run typecheck
> tsc --noEmit
(exit 0)
npm test -- tests/workflows.test.ts tests/server.test.ts
Test Files 2 passed (2)
Tests 40 passed (40)
npm run build
> tsc -p tsconfig.build.json
(exit 0)
```

Sabotage: temporarily removed the simulator's exact-origin guard, then ran
`npm test -- tests/workflows.test.ts -t 'applies exclusion only'`. It failed with
`expected [true,false,true,false] to deeply equal [false,false,true,false]`.
Restored original source; typecheck/build pass. The ordinary full test run before
the mutation passed all 40 tests. Root independently reruns after integration.

Declared limitations: specific-campaign reads omit original URL, so readiness
strips preview query/fragment to avoid forwarding access tokens; query-dependent
pages need browser/manual validation. Specific A/B create recovery with original
query/fragment fails conservatively because API reads cannot prove exact identity.
Simulator conservatively compares full supplied URLs for specific A/B campaigns.
The API cannot inspect saved edits/preview completion or browser execution.

No external service mutations, key use, package edits or contract snapshot changes.
Root owns documentation and complete integration/packaging verification.

Independent review: root inspected source/scopes, independently reran 40 focused tests and typecheck, then all 133 integrated tests passed; accepted 2026-11-12.
