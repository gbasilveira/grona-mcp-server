# Resuming a WO in another session or account

> foundry-protocol template (from a multi-agent project, internal DR). State lives
> **in the repository**, not in the conversation: any session or account can
> resume a WO from here.

1. Run `scripts/wo.sh status` to see what is in progress or ready.
   `scripts/wo.sh status NNN` shows the `[x]` tasks, the branch commits and the
   worktree.
2. `scripts/wo.sh resume NNN` prints the resume prompt. Paste it into a new
   session, from any account, or use it as the prompt of a **new** agent
   (`ORCHESTRATOR-LOOP.md`, rule 2).
3. First of all, in the worktree, run `git status`. Changes in `src/` that are not
   part of the current task may be legitimate work or a sabotage interrupted
   midway. **First preserve the diff and the new files**, in a checkpoint outside
   the files to be restored. Only restore a mutant that has been identified with
   certainty. Never do a blanket `checkout`/`reset`/`clean`.
4. Do not redo tasks marked `[x]`. Each task is one commit, and that commit also
   marks the `[x]` in the WO. Update and commit the RESULT after each task
   (`LESSONS.md` #19).
5. Keep the context minimal. Read only the WO and the packages' `CONTEXT.md` files;
   find DRs via `docs/DR-INDEX.md` and read only the cited ones. Run the tests with
   summarized output (`| tail -20`).
6. Two sessions working on the same WO in parallel are **forbidden**. Before
   resuming, confirm the previous one is dead (`git log -1 --format=%cr` on the
   branch, live processes, `ListAgents`).
7. An interruption or a rate limit without a confirmed result does not count as a
   passed or failed test. Reconcile the logs and the exit status before deciding
   to repeat.
8. Model: the fast one for mechanical work, the most capable one for security and
   concurrency (the «Agent» field of the queue).
9. Format contract for external tools: `docs/FORMAT-CONTRACT.md`. Run
   `scripts/check-format-contract.sh` before changing any WO header, queue line or
   log line.
