# Grona MCP — mission control

## 0. Current state

| | |
|---|---|
| Project | Grona MCP |
| Active phase | None — implementation complete |
| Closed phases | Discovery and P1: all 10 routes, 9 helpers, documentation and verification |
| State of the main branch | 157 tests green; typecheck/build/docs/package/Docker checks passed |
| Blockers | None for delivery; live-account tests excluded because no credentials were supplied |

Baseline invariant: `docs/upstream/grona-api.yaml` is the authoritative captured contract.
Change it deliberately with route coverage verification. Working branch: main.

## 1. Roles

Root plans and independently reviews work orders. Executors implement a bounded WO.
The user authorized autonomous implementation. No product direction gates or external
publishing are needed. Foundry is used for workorder management; implementation can
proceed in this session without optional autonomous-loop infrastructure.

## 2. Cycle

Write WO with PREPARATION, scope, acceptance commands and sabotage checks; execute;
fill RESULT; root reviews by command; accept or create corrective WO. Keep queue,
log and memory current. Work in isolated worktrees for parallel agents. Each executor
commits its own tasks and WO RESULT; root integrates after review. Never use live
credentials in fixtures. One agent per WO; at most two concurrent executors.

## 3. Shared context

- Repository: `/home/gbas/trabalho/gbasilveira/grona-mcp` (initially empty).
- Runtime: Node 22.23.1, npm 10.9.8; TypeScript, official MCP SDK v2, Zod, Vitest.
- Source: https://developer.grona.ai/api/ and `/openapi/grona-api.yaml`, fetched 2026-11-12.
- Snapshot and downloaded guide text: `docs/upstream/`; tests use fake fetch/local HTTP only.
- Ten operations include mobile grants on a separate host with separate secret.
- No campaign analytics, variation-content editing, grant redemption or key-management API exists.
- Secrets only via environment/programmatic config; none required for build and tests.
- Use full API envelopes and preserve unknown response fields/enums.
- Base branch main; isolated worktrees under `/tmp/grona-mcp-wo-NNN`.
- Models inherited from current session; no hardcoded model dependency.
- Canonical checks: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run verify`.
- Public contract snapshot changes only by a WO explicitly authorizing them.
- Root owns package configuration and integration; executor scopes avoid overlaps.

## 4. Work order queue

| WO | Title | Phase | Status | Agent | Depends on |
|---|---|---|---|---|---|
| 001 | Typed API client and validation | P1 | ACCEPTED | client | — |
| 002 | MCP tools and agent workflows | P1 | ACCEPTED | server | 001 interface |
| 002b | Conservative A/B recovery and launch diagnostics | P1 | ACCEPTED | client | 002 |
| 003 | Documentation and independent verification | P1 | ACCEPTED | root | 001, 002, 002b |

### 4.1 — Gate queue

| Gate | Title | Phase | Status | PR | WOs |
|---|---|---|---|---|---|

## 5. Log — append-only

2026-11-12: P1 complete. All workorders accepted. See `history/P1-SUMMARY.md` and `VERIFICATION.md`.

## 6. Memory

Record enduring decisions in `docs/memory/entries/` and index them in MEMORY.md.
General lessons belong in foundry-protocol only when novel and applicable elsewhere.
