# WO-002b — Conservative A/B identity and actionable launch failures

| | |
|---|---|
| Phase | P1 |
| Status | IN REVIEW |
| Depends on | WO-002 |
| Branch | `wo/002b-recovery` |

## PREPARATION

Root repository `/home/gbas/trabalho/gbasilveira/grona-mcp`; isolated worktree
`/tmp/grona-mcp-wo-002b`, created from current main by root. Symlink root node_modules.
No secrets or live requests needed. Read src/CONTEXT.md, workflows.ts and prior WO-002 RESULT.
Smoke: `node --version` → v22.23.1. Baseline: 133 tests green, build/typecheck green.
Checks: `npm test -- tests/workflows.test.ts tests/server.test.ts`, `npm run typecheck`.

## Objective and tasks

- [x] Reject create-once conflict recovery whenever original specific A/B exact URL identity cannot be proved, even when the requested URL has no query. Preview params are undocumented, so stripping them cannot prove the absence of an existing original query. Conservative refusal for all specific A/B conflicts is acceptable and preferred to false identity.
- [x] Preserve safe original GronaError details on launch failures. Known documented 400/401/403/404/409/429 rejections must remain actionable with original code/status and completedSteps; timeout/network/5xx/malformed success may leave uncertain outcome and must say so. Never surface raw unexpected exception text or tokens.
- [x] Add regression tests for old campaign original query vs new request without query, known status rejection and ambiguous mutation failure; sabotage the identity safeguard and show detection, then restore.

## Out of scope

Only src/workflows.ts, tests/workflows.test.ts, tests/server.test.ts and this WO RESULT.
No docs/catalog/client/config/package changes; no live calls. Root updates full docs.
Original WO-002 is retained; this corrective workorder records additional review findings.

## Acceptance

Focused tests and typecheck pass. Specific A/B identity is never proven from stripped preview data.
Launch rejects known errors without discarding status/code; ambiguous failure includes cause metadata
where sanitized by GronaClient. Unexpected errors remain generic. Commit all tasks and self-contained RESULT.

## RESULT

Implemented and ready for independent review.

- Branch: `wo/002b-recovery`; base: `c23cfdfcad2d33c2a0fb2357e9a159cae0743b2c`.
- Changed files: `src/workflows.ts`, `tests/workflows.test.ts`, `tests/server.test.ts`,
  this workorder only.
- Every specific A/B create conflict now refuses unverifiable URL identity. This
  includes queryless requests and previews containing original or undocumented
  query parameters. No links are minted and existing campaigns remain untouched.
  Matching multi-page A/B recovery remains supported using its stored sample URL.
- Launch errors for documented rejection statuses 400/401/403/404/409/429 retain
  upstream code/status/message/retry metadata/recovery and completed/attempted steps.
  A missing credential also remains a known local rejection. Timeout, network,
  gateway/5xx and malformed-success failures retain `launch_outcome_uncertain` plus
  normalized GronaError cause metadata. Unexpected raw exception messages are hidden.
- Added 23 regressions across direct workflow behavior and real in-memory MCP calls.

Verification after restoration:

```text
npm run typecheck
> tsc --noEmit
(exit 0)

npm test -- tests/workflows.test.ts tests/server.test.ts
Test Files  2 passed (2)
Tests       63 passed (63)
(exit 0)
```

Sabotage checks:

1. Restored the faulty condition that only refuses A/B identity when the new request
   has a query/fragment: exit 1; all three new queryless-request regressions fail
   (3 failed / 60 passed).
2. Disabled the known-rejection branch so launch failures lose original status/code:
   exit 1; six workflow and six MCP rejection regressions fail
   (12 failed / 51 passed).

Both mutants were restored before the final passing verification. No live API calls
or secrets used; no changes outside the declared source/test/workorder scope.

Deviations: none. Root refreshes documentation and independently reviews/integrates.

