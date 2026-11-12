# WO-003 — Documentation and independent verification

| | |
|---|---|
| Phase | P1 |
| Status | IN PROGRESS |
| Depends on | WO-001, WO-002 (final integration) |
| Branch | `main` |

## PREPARATION

Root workspace `/home/gbas/trabalho/gbasilveira/grona-mcp`; Node 22.23.1 and npm 10.9.8.
Dependencies installed by locked npm install; no API credentials supplied or needed.
Snapshot contains 10 operationIds. Smoke: `node --version` → v22.23.1.
Canonical checks: `npm run verify`, `npm run test:coverage`, `npm pack --dry-run`.

## Tasks

- [ ] Generate complete route/field/response MCP equivalent reference from upstream snapshot.
- [ ] Document configuration, installation, all tools/resources/prompts, workflows, security, errors and API limitations.
- [ ] Add reproducible CI/package deployment and SDK stdio integration/contract tests.
- [ ] Independently review executor results, run full verification, address issues, close workorders and memory.

## Scope

Root docs, package/CI/examples, scripts/generate-api-docs.ts and tests/integration.test.ts.
No production mutations, publishing or remote PRs; no fabricated credentials/live verification claims.
Source fixes discovered by review go through corrective workorders where required by protocol.

## Acceptance and sabotage

All 10 OpenAPI operations map to discoverable MCP tools; every documented tool is discoverable.
Built CLI initializes through actual stdio SDK client and exposes resources/prompts; invalid calls return errors.
Generated docs drift check fails after route mapping sabotage. Full check output recorded in RESULT.

## RESULT

Pending.
