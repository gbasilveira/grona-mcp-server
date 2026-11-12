# Orchestration — mission control (generic template)

> **Living document, kept small on purpose.** This is how the orchestrator
> (human) and Claude (planning + review) communicate. Sub-agents read **§2**
> and **§3** and their work order before starting — nothing else, by default.
>
> Generalized from the experience of a compliance-audit project (see `LESSONS.md`).
> (T0-T5, 2026-09) in [`foundry-protocol`](../../../foundry-protocol). If this file
> grows too large (rule of thumb: > ~300 lines, or read by default by every
> launched agent without needing most of it), split it the way that project
> did: this file keeps only protocol + active state; history/open questions
> go to `DECISIONS.md`; closed phases are condensed into `history/<phase>-SUMMARY.md`.
> See [`foundry-protocol/docs/LESSONS.md`](../../../foundry-protocol/docs/LESSONS.md#manter-o-documento-vivo-pequeno).
>
> **Fill in when instantiating:** the `<fill in>` fields of §0 and §3 below,
> with concrete facts about this project.

---

## ⇢ New Claude session (planning & review) — start here

1. Read this document **top to bottom** (§0 state → §5 active log).
2. Read the summary of the most recent closed phase in `history/` (if it
   exists) — it is the minimum context to work on the next one.
3. Read `DECISIONS.md` §2 — questions still open.
4. Read `docs/memory/MEMORY.md` (index) of this project and follow the
   relevant links — it is the living memory, written at every cycle (see §6),
   not just the condensed history. Also read the README for the structural why.
5. `git log --oneline` on the active branch and `git worktree list` — see what
   is already done and where there is work to integrate. `scripts/wo.sh status`,
   `scripts/wo.sh next`, `scripts/gate.sh status` and `scripts/wo-watchdog.sh`
   give the same in short form; an interrupted WO is resumed via
   `docs/RESUME.md`. If `docs/RESTART-PROMPT.md` exists and is up to date,
   start from it.
6. Check §4 (queue): any WO in `IN REVIEW` → read its `RESULT`, review it
   against the acceptance criteria, mark `ACCEPTED`/`CHANGES REQUESTED` in §5,
   update §0, and (if `ACCEPTED` and on its own branch) merge.
7. Your role is **§1 → Planning & review**. You do not execute whole phases in
   a single context; you write work orders and review them.
8. Before closing a phase (or whenever you learn something that would help any
   future project, not just this one): distill the lesson into
   `foundry-protocol/docs/LESSONS.md`. See §6.

---

## 0. Current state

| | |
|---|---|
| Project | `Grona MCP` |
| Active phase | `<fill in>` |
| Closed phases | `<fill in>` |
| State of the main branch | `<e.g.: tsc clean · tests green · build green>` |
| Blockers | `<none or list>` |

**Live branches:** `<fill in>`

**Baseline invariant (if applicable):** `<which deterministic artifact protects
this project — snapshot, fixture, golden test — and the rule that it changes
only deliberately, in a WO whose declared goal is to change it>`.
Otherwise, if it is touched: **stop and report**, never accept it by reflex —
compare **key by key**, never by diffstat. (Lesson validated in
production — see `LESSONS.md` #5.)

---

## 1. Roles

| Role | Who | Does | Does not do |
|---|---|---|---|
| **Orchestrator** | human | Launches agents, relays results, injects data/decisions, arbitrates priorities. Edits this document freely. | Does not write project code. |
| **Planning & review** | Claude (this session and successors) | Writes the work orders, reviews agent output, updates state and log, decides the next step. May do small tasks directly. | Does not execute whole phases in a single context. |
| **Sub-agent** | agent launched by the orchestrator or by Claude | Executes **one** work order, in a fresh context, reading only what the WO says. Fills in the `RESULT` section. Commits to the phase branch. | Does not leave the WO's scope. Does not touch what the WO marks "out of scope". |

---

## 2. Protocol of one cycle

1. **Claude** writes `docs/work-orders/WO-NNN-<slug>.md`, adds it to the queue
   (§4) with status `READY`, and produces the launch prompt (§2.1/§2.2).
2. **Claude** (or the orchestrator) launches the agent with that prompt.
3. **Agent** works, commits, fills in `RESULT`, returns a summary.
4. **Claude** reviews against the acceptance criteria — **by command, not by
   report**: recomputes numbers independently, confirms the scope fences with
   `git diff`, reads the baseline diff key by key if it changed. Marks
   `ACCEPTED`/`CHANGES REQUESTED` in §5, updates §0 and the progress, merges if
   accepted, and writes the next WO.
   (Validated lesson — `LESSONS.md` #2: "verify by command, not by report" is the
   criterion that has most often caught real problems.)
5. Repeat.

### 2.1 — The `PREPARATION` block (mandatory in every prompt)

System conditions that are **guaranteeable** — only what was **verified in this
session** goes here, never what is assumed. It covers at least:

- **Absolute paths from `/`.** The agent's initial cwd is not guaranteed.
- **Create the worktree BEFORE any other work**, if the project uses git
  worktrees to isolate sub-agents.
- **Dependency bootstrap** (`node_modules`/`venv`/etc.) — how to rebuild without
  reinstalling everything, except in the WO that changes dependencies.
- **Does it need secrets/API keys?** State explicitly whether it does or not,
  so the agent does not go hunting for a nonexistent `.env`.
- **Smoke test before starting**, with the expected output.
- **Canonical commands** for test/typecheck/build in this project.

### 2.2 — Prompt body

> Read `docs/ORCHESTRATION.md` §2 and §3, and `docs/work-orders/WO-NNN-<slug>.md`.
> Execute the work order **exactly within the defined scope**. Fill in the
> `RESULT` section. Commit to the indicated branch, using conventional messages.
> At the end, return a self-sufficient summary: status, commits, files touched,
> deviations, and the output of the verification commands.

**Parallelism:** WOs with no dependency between them (empty "Depends on" column
or already `ACCEPTED`) may run at the same time, each agent in its own **git
worktree**. WOs that touch the same files run in series, or accept that the merge
resolves a trivial rebase. (`LESSONS.md` #8.)

**Rules every WO inherits** (from a multi-agent project):

- **One commit per task**, with the `[x]` in the same commit; the RESULT is
  updated and committed after each task. This way progress survives a rate
  limit (`LESSONS.md` #19).
- **Sabotage checks** are part of the acceptance criteria of any WO with tests
  that protect something. A sabotage is a deliberate mutant of the target
  function that the tests **must** catch. The ones that escape go into the
  RESULT (`LESSONS.md` #10, #14, #15).
- **Minimum context:** the WO cites the `CONTEXT.md` files of the packages
  (`docs/CONTEXT-TEMPLATE.md`) and the DRs via `docs/DR-INDEX.md`. The agent
  does not read `src/` or the whole `DECISIONS.md` by default (`LESSONS.md` #23).
- **Corrective WO:** a rejected review produces `NNNb` (`NNNc`, …), written
  again. The original WO is not patched.
- **If one requirement of the WO contradicts another** (or an accepted test), the
  agent stops and reports (`LESSONS.md` #17).

### 2.3 — Human validation gates

A phase whose result the user must **see and decide on** (design, UX, UI,
content, product direction) closes with a **gate**:
`docs/gates/GATE-NN-<slug>.md`, from `docs/gates/TEMPLATE.md`, with one line in
the gate queue (§4.1).

1. **A gate is at least one PR.** The gate's WOs branch and integrate into the
   branch `gate/GNN-<slug>` (`docs/foundry.conf`). That branch enters the base
   branch by PR, and only after the gate is `APPROVED`. Opening the PR is an
   external action: `scripts/gate.sh pr NN` prints the command and the user
   confirms.
2. **The gate carries a complete report of completed operations.** The
   orchestrator generates it with `scripts/gate.sh report NN --verify` (WOs and
   states, commits, files, literal verification) and completes it with what was
   delivered, the deviations, the limitations, the decisions taken and the
   questions, each with a recommendation. It must be enough for the user to
   decide without opening the code (`LESSONS.md` #4).
3. **Few, factual criteria**, per useful dimension (Design, UX, UI,
   Accessibility, Content, Technical). Each criterion says how it is verified.
   A walkthrough of steps and "how to open it" with synthetic data are attached.
4. **`READY FOR REVIEW` is a legitimate stop**, including in the autonomous
   cycle. The user fills in "User decisions". The orchestrator turns each decision
   into a DR and/or WOs before opening the next gate. `CHANGES REQUESTED` produces
   corrective WOs within the same gate.
5. Gates are **few**: one per real direction-level decision, not one per WO.
6. **Autonomous gate mode** (`GATE_MODE=autonomous` in `docs/foundry.conf`, only on the
   user's explicit request, recorded as a DR): a gate is **not** a stop. When every WO
   of the gate is `ACCEPTED`, the orchestrator runs `scripts/gate.sh close NN` (refuses
   unless all WOs are accepted and `VERIFY_CMD` passes), completes the gate file
   (delivered, deviations, limitations, decisions, open questions — each with the
   decision it took and why), **writes or refreshes the documentation the gate lists**
   (documentation is a mandatory gate deliverable in this mode), sets the gate to
   `APPROVED`, merges the gate branch into the base branch, records `GATE` in the log and
   continues with the next gate. "User decisions" in the gate file records
   `autonomous — no human validation (DR-NN)`.
7. **Instruction inbox** (any mode): the user may steer at any time through
   `docs/INSTRUCTIONS.md` (or a chat message). Every orchestrator tick reads it first;
   each new entry becomes a `USER` log line and, if it changes scope or a decision, a DR
   and/or WOs (corrective `NNNb`, new WOs, or re-ordered queue). Instructions are
   applied **without stopping the flow**: work unaffected by them continues; affected
   WOs are re-planned. Entries are marked processed (date + resulting DR/WO) — never
   deleted.

### 2.4 — Autonomous cycle (optional)

Only on explicit request from the user. The rules are in
`docs/ORCHESTRATOR-LOOP.md`:

- the orchestrator does not implement;
- a failure leads to a new agent;
- logging is total (hook `scripts/orch-hook.py` plus
  `scripts/olog.sh` → `docs/orchestration-log/LOG.md`);
- there is a heartbeat via `ScheduleWakeup`;
- legitimate stops include the gates.

The tools read the documents without an LLM as long as
`docs/FORMAT-CONTRACT.md` is respected (verified by `scripts/check-format-contract.sh`).

---

## 3. Shared context — canonical for all agents

> **Fill in per project.** This is what changes from instance to instance —
> concrete facts, not protocol. If something changes, correct it **here** and
> announce it.

- **Fixed domains/test data:** `<fill in — what is safe to use repeatedly without
  re-capturing/re-crawling/re-generating>`
- **Models per role:** `<fill in — which model per task type; keep it swappable per
  call, not hardcoded>` (`LESSONS.md` #9). Default cost policy (`LESSONS.md` #33): strongest
  model writes design/security WOs and independently reviews security/money WOs; a cheaper model
  executes READY WOs whose oracles, sabotages and acceptance commands are fixed; ≤ 2 concurrent
  agents; full verification once per gate.
- **What does NOT exist / was removed on purpose:** `<fill in — so that an agent
  does not reintroduce it without that context>`
- **Package manager and setup particularities:** `<fill in>`
- **Secrets:** `<where they live, if agents need them>`
- **Branch strategy:** `<one branch per phase? per WO? fill in>`
- **Commits:** Conventional Commits. Attribution footer as configured in the session.
- **Worktrees:** `<isolated by default, to allow parallelism — or not>`
- **Script configuration:** `docs/foundry.conf` (`BASE_BRANCH`,
  `GATE_BRANCH_PREFIX`, `VERIFY_CMD`).
- **Canonical commands:** `<fill in — test/typecheck/build/format, and what fails
  in a fresh worktree>`
- **Context per package:** `packages/<p>/CONTEXT.md` (≤ 45 lines). DRs via
  `docs/DR-INDEX.md`.
- **Returning results:** the `RESULT` section of the WO must let the reviewer
  understand **without opening the code** — branch + base SHA, commit table,
  files touched, justified deviations, follow-ups, verification output.
  (`LESSONS.md` #4.)
- **Never touch without an explicit WO:** `<fill in — sensitive areas: UI, legal
  catalogue, public API contract, etc.>`

---

## 4. Work order queue

| WO | Title | Phase | Status | Agent | Depends on |
|---|---|---|---|---|---|
| | | | | | |

**Statuses:** `DRAFT` → `READY` → `IN PROGRESS` → `IN REVIEW` →
`ACCEPTED` / `CHANGES REQUESTED`. `DONE` (the agent finished and the WO awaits
review), `PARTIAL` and `BLOCKED` are also used. The queue is the canonical
state. The format of each line is fixed:
`| NNN[a-z] | title | phase | STATUS | agent | depends on |`
(`docs/FORMAT-CONTRACT.md`).

### 4.1 — Gate queue

| Gate | Title | Phase | Status | PR | WOs |
|---|---|---|---|---|---|

**Statuses:** `DRAFT` → `OPEN` → `READY FOR REVIEW` → `APPROVED` /
`CHANGES REQUESTED`. Each line follows
`| GNN | title | phase | STATUS | PR | WOs |`.

---

## 5. Log — append-only

> When a phase closes, condense its log into `history/<phase>-SUMMARY.md` and
> restart this section with only what comes next — keep this small. The verbatim
> record is always available in `git log`; the summaries do not replace it, they
> only keep new sessions from reading everything by default. The operational
> record (every launch, result, review, merge, decision and gate) lives in
> `docs/orchestration-log/LOG.md`, written by `scripts/olog.sh`. This section
> keeps only the cycle notes a human reads.

### `<date>` · Claude · `<short summary of the cycle>`

<fill in when used>

---

## 6. Self-improvement — an obligation, not optional

Two directions, not to be confused:

- **What is specific to this project** (a fact, a decision, something learned
  about this code/domain) — is written to `docs/memory/entries/<slug>.md` of
  **this** project (format in `docs/memory/ENTRY-TEMPLATE.md`), with the index
  updated in `docs/memory/MEMORY.md`. This happens **at every cycle that produces
  something worth remembering** — not only when closing a phase. This is what makes
  the project's memory grow by itself as it runs, instead of depending on someone
  writing prose manually in the log. Images (screenshots, diagrams) always go in
  `docs/memory/media/<slug>/`, never loose elsewhere.
- **What generalizes** — an acceptance criterion that was missing, a prompt shape
  that confused an agent, a sign that the baseline was being accepted by reflex,
  anything that would help **any** future project, not just this one — goes up to
  [`foundry-protocol/docs/LESSONS.md`](../../../foundry-protocol/docs/LESSONS.md).
  This is rarer than project memory; it typically happens when closing a phase,
  not at every WO.

Broad history/decisions (not an isolated memory entry) remain in this project's
`DECISIONS.md`/`history/`, as before.
