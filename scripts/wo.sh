#!/usr/bin/env bash
# Original authors and maintainers: αIAt (https://aiat.pt) and Guilherme da Silveira (gbasilveira@gmail.com).
# License: GPL-3.0-or-later — see LICENSE at the repository root.
# Usage: scripts/wo.sh status [NNN] | resume NNN | next
# State lives in the repo: any session/account resumes from here (foundry-protocol, docs/RESUME.md).
set -euo pipefail
source "$(dirname "$0")/_conf.sh"
wo_file() { ls docs/work-orders/WO-"$1"-*.md 2>/dev/null | head -1; }
branch_of() { sed -n 's/^| *Branch *| *`\([^`]*\)`.*/\1/p' "$1" | head -1; }
queue() { grep -E "^\| *$WO_ID *\|" docs/ORCHESTRATION.md || true; }
case "${1:-status}" in
  status)
    if [ -n "${2:-}" ]; then
      f=$(wo_file "$2"); [ -n "$f" ] || { echo "WO-$2 does not exist"; exit 1; }
      b=$(branch_of "$f"); echo "== $f  branch=$b  base=$BASE"
      queue | grep -E "^\| *$2 *\|" || echo "(no line in the queue)"
      grep -E '^\s*[0-9]+\. .*\[( |x)\]|^- \[( |x)\]' "$f" | head -30 || true
      git log --oneline "$BASE..$b" 2>/dev/null | head -20 || echo "(no branch)"
      git worktree list | grep -F "[$b]" || true
    else
      queue | grep -vE '\| *(ACCEPTED|DONE|DRAFT) *\|' | cut -c1-140
    fi;;
  resume)
    [ -n "${2:-}" ] || { echo "Usage: $0 resume NNN"; exit 1; }
    f=$(wo_file "$2"); [ -n "$f" ] || { echo "WO-$2 does not exist"; exit 1; }
    b=$(branch_of "$f")
    echo "Resume prompt (paste into a new session, from any account, or use as the prompt of a NEW agent):"
    cat <<EOT
Continue WO-$2: read $ROOT/$f, the indicated CONTEXT.md files and the existing checkpoint/PROGRESS.
Declared branch: '$b' (base '$BASE'). Run 'scripts/wo.sh status $2' and 'git worktree list'.
Confirm that the effective worktree and branch match the WO before writing.
Confirm that the previous worker has stopped (processes/session and supervisor); if it is
still active or its status is unknown, do not start another writer.
Inspect git status, diff, new files, commits and [x] tasks. Do not repeat
tasks already committed; unknown changes may be legitimate work.
Before restoring any change, preserve the diff, new files and evidence in a
durable checkpoint outside the files that would be restored. Only restore a mutant
(sabotage) positively identified, preserving the evidence first and without discarding
other changes. Without safe identification, preserve and report; do not use checkout/reset/
clean in bulk or remove files to obtain a clean tree.
Read the verification commands, logs and durable exit statuses. An interruption/rate limit
without a confirmed result does not mean a test passed or failed. If the result is
unknown, reconcile the process and the evidence before deciding to repeat.
Before the next expensive work, record branch/base, the absolute path of the worktree,
completed tasks, pending changes, the exact next command and the paths of the logs
and of the exit status file. Mark [x] in the same commit as each completed task and
update/commit the RESULT after each task.
Fill in RESULT with verifications and limitations; keep this resume informational only,
with no automatic restores, resets, clean or removals.
EOT
    ;;
  next) queue | grep -E '\| *READY *\|' | cut -c1-140 ;;
  *) echo "Usage: $0 status [NNN] | resume NNN | next"; exit 1;;
esac
