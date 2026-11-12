# Format contract for work order tools

Status: in force since this project was instantiated. It is verified by
`scripts/check-format-contract.sh`. (foundry-protocol template, generalized from a
multi-agent project, 2026-10-05.)

External tools (cross-project dashboards, the foundry-protocol MCP tools, the
`wo.sh`/`wo-watchdog.sh`/`gate.sh` scripts) read this repository's orchestration
documents **without migration and without an LLM**. They can only do so while the
shapes below remain stable. This file lists exactly what must not drift; the rest
of the documents is free prose.

## The contract

1. **Work order file names:** `docs/work-orders/WO-NNN[a-z]-<slug>.md`. Three digits,
   an optional lowercase letter suffix (`008b`, for corrective WOs) and a kebab-case
   slug. `TEMPLATE.md` is the only other file allowed in that directory.
2. **Work order header table:** each WO file has these lines, each as
   `| <Key> | <value> |`: `Phase`, `Status`, `Depends on`, `Branch`. The first word
   (or words) of `Status` is one of the statuses below. A trailing note in
   parentheses is allowed (`ACCEPTED (with deviations: see RESULT)`).
3. **Queue lines:** `docs/ORCHESTRATION.md` §4 has one line per work order, in the
   format `| NNN[a-z] | title | phase | STATUS | agent | depends on |` (six columns).
   The queue is the **canonical** place for the current state of a work order.
4. **Task markers:** tasks inside a work order are marked `[ ]` / `[x]` (lowercase
   `x`), **in the same commit** as the work the task describes.
5. **Orchestration log lines:** `docs/orchestration-log/LOG.md` is append-only, with
   one entry per line: `- <UTC timestamp> · **<TYPE>** · <text>`. The timestamp is
   `YYYY-MM-DDTHH:MMZ` and `<TYPE>` is one of `LAUNCH`, `RESULT`, `REVIEW`, `MERGE`,
   `DECISION`, `WATCHDOG`, `RELAUNCH`, `USER`, `GATE` or `NOTE`. Entries are written
   with `scripts/olog.sh`.
6. **Human validation gates:** files are `docs/gates/GATE-NN-<slug>.md` (two digits
   and a kebab-case slug); `TEMPLATE.md` is the only other file allowed. The header
   has the lines `| Phase |`, `| Status |`, `| WOs |` and `| PR |`. The gate queue in
   `docs/ORCHESTRATION.md` §4.1 has one line per gate, in the format
   `| GNN | title | phase | STATUS | PR | WOs |` (six columns). The queue is canonical.

**Allowed work order statuses:** `DRAFT`, `READY`, `IN PROGRESS`, `IN REVIEW`,
`ACCEPTED`, `CHANGES REQUESTED`, `DONE` (the agent finished and the WO awaits
review), `PARTIAL` and `BLOCKED`.

**Allowed gate statuses:** `DRAFT`, `OPEN` (WOs in progress), `READY FOR REVIEW`
(complete report and PR open), `APPROVED` and `CHANGES REQUESTED`.

## Known drift (not a violation, but do not rely on it)

The `Status` line inside a WO or gate file is written when the file is created and
**is not maintained afterwards**. Consumers must therefore read the state from the
queue (rules 3 and 6), never from the file header. The verifier reports these
differences as warnings.

## Changing the contract

If any of these shapes must change, record the reason in `DECISIONS.md` and update
`scripts/check-format-contract.sh` in the same commit, so that external tools follow
the change. Adding prose, new work orders, or a new log type (with the verifier
updated first) is always allowed.
