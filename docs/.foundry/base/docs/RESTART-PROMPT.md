# Restart prompt (paste into a new session, at the root of this project)

> foundry-protocol template. It is maintained by the orchestrator: update it at every
> phase or gate closure, so that a new session (from any account) resumes without
> reading the history. **Fill in when instantiating.**

You are resuming, as **orchestrator** (role "Planning & review"), the project **`Grona MCP`**. Talk to the user in `<language>`, in a direct way.

## 1. Get oriented first (in this order; do not write code before)

1. `git status --short` and `git branch --show-current`. You must be on a clean
   branch. **Never push** without the user's request.
2. `scripts/wo.sh next` (WOs ready), `scripts/wo.sh status` (in progress) and
   `scripts/gate.sh status` (gates). Read `docs/RESUME.md`.
3. Read **only what is necessary**:
   - `docs/ORCHESTRATION.md` §0, §4 and §4.1 (queues) and §5 (active log);
   - `docs/DR-INDEX.md`;
   - the summary of the last phase in `docs/history/`;
   - `docs/memory/MEMORY.md`.

   For each package, read `packages/<p>/CONTEXT.md` and not `src/`.
4. `git worktree list`. A worktree with commits to integrate is an interrupted WO:
   follow `docs/RESUME.md`.
5. Run the canonical commands (`docs/foundry.conf`, `VERIFY_CMD`) and confirm they
   are green before launching any work.

## 2. State on `<date>`

`<fill in: closed phases, gates approved/pending, WOs READY, accepted risks, test counts>`

## 3. User decisions (already taken — do not reopen)

`<fill in: short list with the DR for each one>`

## 4. How you work

The protocol is in `docs/ORCHESTRATION.md` §2. Autonomous cycle (only if the user
activated it) in `docs/ORCHESTRATOR-LOOP.md`. Human validation gates in `docs/gates/`.

## 5. What to do first in this session

`<fill in>`
