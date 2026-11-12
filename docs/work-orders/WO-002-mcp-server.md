# WO-002 — MCP tools and agent workflows

| | |
|---|---|
| Phase | P1 |
| Status | READY |
| Depends on | WO-001 shared interface (implementation parallel) |
| Branch | `wo/002-server` |

## PREPARATION

Repository `/home/gbas/trabalho/gbasilveira/grona-mcp`; worktree `/tmp/grona-mcp-wo-002`.
Root installs dependencies; symlink root node_modules. Node 22.23.1 verified; no keys needed.
Read orchestration §3, WO-001 shared interface, `docs/upstream/grona-api.yaml` and guides.
Smoke `node --version`; SDK v2 installed in root node_modules, inspect types/examples for accurate API.
Verify `npm run typecheck` once integrated; focused tests executable against fake client.

## Tasks

- [ ] Implement `src/server.ts`, `src/workflows.ts`, `src/catalog.ts`, `src/index.ts` with official MCP SDK v2 stdio server.
- [ ] Register 10 direct tools, full schemas, precise annotations, structured results and actionable safe errors.
- [ ] Implement useful inferred workflows: local search/filter/sort campaigns; idempotent create recovery with identity checks; campaign overview with preview links; live readiness with fresh snippet verification; safe launch requiring explicit edited/previewed attestations; role-based A/B split updates; page-targeting simulator; installation snippet generation.
- [ ] Add static reference resources and reusable prompts, configuration diagnostics without secrets.
- [ ] Meaningful focused tests for workflows and in-memory MCP protocol discovery/calls/errors/resources/prompts.

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

Pending.
