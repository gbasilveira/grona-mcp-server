# WO-NNN — <short title>

| | |
|---|---|
| Phase | <fill in> |
| Status | DRAFT \| READY \| IN PROGRESS \| IN REVIEW \| ACCEPTED \| CHANGES REQUESTED |
| Depends on | WO-___ (or —) |
| Branch | `<fill in>` |
| Estimate | _ agent session(s) · risk low/medium/high |
| Suggested model for the agent | <mechanical → fast/cheap \| design/risk → more capable> |
| Isolated worktree | yes / no |

## Context to read first (in this order)

- `docs/ORCHESTRATION.md` §2 (protocol) and §3 (shared context)
- <other files specific to this WO>

## PREPARATION (verified in this session — `ORCHESTRATION.md` §2.1)

- Absolute paths; worktree: `git worktree add <path> -b <branch> <base>` **before** any work.
- Dependencies: <how to rebuild without reinstalling everything>. Secrets: <none / which and where>.
- Smoke test: `<command>` → `<expected output>`.
- Canonical commands: `<test/typecheck/build/format>`.
- Rules: one commit per task with the `[x]` in the same commit; RESULT updated and committed after each task; if a requirement contradicts another or an accepted test, **stop and report**.

## Objective

<1–3 sentences: what this WO delivers and why. No ambiguity.>

## Tasks

1. …
2. …

## Inputs provided

- <data the orchestrator injected, or "none">

## Deliverables

- <new/changed/deleted files, concrete>

## Acceptance criteria

- [ ] <verification command 1 — typecheck/lint/equivalent, clean>
- [ ] <verification command 2 — tests, green>
- [ ] <verification command 3 — build, green, if applicable>
- [ ] <specific to this WO>

## Sabotage checks

> Deliberate mutants of the target function that the tests **must** catch
> (`LESSONS.md` #10, #14, #15). Apply each one, run the tests, record the
> result and revert. The working tree is clean at the end.

| #   | Sabotage (what breaks)    | Test that must fail     | Result    |
| --- | ------------------------- | ----------------------- | --------- |
| S1  |                           |                         |           |

## Out of scope — DO NOT TOUCH

- <files/areas that another WO handles, or a sensitive zone of the project>

## Notes / risks

- <what could go wrong, what to do if blocked>

---

## RESULT — filled in by the agent

> Must be **complete and self-sufficient**: the reviewer understands without
> opening the code. See `foundry-protocol/docs/LESSONS.md` #4.

- **Final status:** DONE \| BLOCKED \| PARTIAL
- **Gate:** GNN (or —)
- **Branch:** `<fill in>` · **base SHA:** `<sha>`
- **Commits:**
  | SHA | Message | Files |
  |---|---|---|
  | | | |
- **Files touched:** new / changed / deleted (explicit list)
- **Summary of work:** (numbered, concrete)
- **Deviations from the plan (and why):** each with justification and impact
- **Verification:**
  ```
  <literal output of the verification commands>
  ```
- **Notes for the reviewer:** decisions that need validation, doubts, spot-checks done
- **Suggested follow-ups:** things noticed out of scope (not done here)
