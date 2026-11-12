# WO-002b — Conservative A/B identity and actionable launch failures

| | |
|---|---|
| Phase | P1 |
| Status | READY |
| Depends on | WO-002 |
| Branch | `wo/002b-recovery` |

## PREPARATION

Root repository `/home/gbas/trabalho/gbasilveira/grona-mcp`; isolated worktree
`/tmp/grona-mcp-wo-002b`, created from current main by root. Symlink root node_modules.
No secrets or live requests needed. Read src/CONTEXT.md, workflows.ts and prior WO-002 RESULT.
Smoke: `node --version` → v22.23.1. Baseline: 133 tests green, build/typecheck green.
Checks: `npm test -- tests/workflows.test.ts tests/server.test.ts`, `npm run typecheck`.

## Objective and tasks

- [ ] Reject create-once conflict recovery whenever original specific A/B exact URL identity cannot be proved, even when the requested URL has no query. Preview params are undocumented, so stripping them cannot prove the absence of an existing original query. Conservative refusal for all specific A/B conflicts is acceptable and preferred to false identity.
- [ ] Preserve safe original GronaError details on launch failures. Known documented 400/401/403/404/409/429 rejections must remain actionable with original code/status and completedSteps; timeout/network/5xx/malformed success may leave uncertain outcome and must say so. Never surface raw unexpected exception text or tokens.
- [ ] Add regression tests for old campaign original query vs new request without query, known status rejection and ambiguous mutation failure; sabotage the identity safeguard and show detection, then restore.

## Out of scope

Only src/workflows.ts, tests/workflows.test.ts, tests/server.test.ts and this WO RESULT.
No docs/catalog/client/config/package changes; no live calls. Root updates full docs.
Original WO-002 is retained; this corrective workorder records additional review findings.

## Acceptance

Focused tests and typecheck pass. Specific A/B identity is never proven from stripped preview data.
Launch rejects known errors without discarding status/code; ambiguous failure includes cause metadata
where sanitized by GronaClient. Unexpected errors remain generic. Commit all tasks and self-contained RESULT.

## RESULT

Pending.
