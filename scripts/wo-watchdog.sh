#!/usr/bin/env bash
# Original authors and maintainers: αIAt (https://aiat.pt) and Guilherme da Silveira (gbasilveira@gmail.com).
# License: GPL-3.0-or-later — see LICENSE at the repository root.
# Detects interrupted WOs (rate limit 429, crash, dead session). Read-only; prints a verdict per WO.
# Usage: scripts/wo-watchdog.sh [minutes_without_commit=20]
set -uo pipefail
source "$(dirname "$0")/_conf.sh"
STALE=${1:-20}; now=$(date +%s)
echo "== queue (not ACCEPTED/DONE/DRAFT) =="
grep -E "^\| *$WO_ID *\|" docs/ORCHESTRATION.md | grep -vE '\| *(ACCEPTED|DONE|DRAFT) *\|' | cut -c1-120
echo; echo "== WOs with a branch (base $BASE and gate branches) =="
shopt -s nullglob
for f in docs/work-orders/WO-*.md; do
  b=$(sed -n 's/^| *Branch *| *`\([^`]*\)`.*/\1/p' "$f" | head -1); [ -n "$b" ] || continue
  git rev-parse --verify -q "$b" >/dev/null || continue
  # integrated into the base or into a gate branch: "integrated" if contained in any of them
  merged=0
  for tgt in "$BASE" $(git for-each-ref --format='%(refname:short)' "refs/heads/${GATE_PREFIX}*"); do
    git merge-base --is-ancestor "$b" "$tgt" 2>/dev/null && { merged=1; break; }
  done
  [ "$merged" = 1 ] && continue
  ahead=$(git rev-list --count "$BASE..$b" 2>/dev/null)
  wt=$(git worktree list | awk -v b="[$b]" '$3==b{print $1}')
  last=$(git log -1 --format=%ct "$b"); age=$(( (now-last)/60 ))
  dirty=0; [ -n "$wt" ] && dirty=$(git -C "$wt" status --short | wc -l)
  src=$(git show "$b:$f" 2>/dev/null || cat "$f")  # the WO lives in the branch (tasks [x] and RESULT)
  done_=$(printf '%s\n' "$src" | grep -cE '^[0-9]+\. \[x\]'); todo=$(printf '%s\n' "$src" | grep -cE '^[0-9]+\. \[ \]')
  res=$(printf '%s\n' "$src" | awk '/^## RESULT/{r=1;next} r&&NF' | wc -l)
  v="IN-PROGRESS"
  if [ "$todo" = 0 ] && [ "$res" -gt 1 ]; then v="FINISHED(review)"
  elif [ "$age" -ge "$STALE" ]; then v="STALLED(>${STALE}min without commit: launch a NEW agent with wo.sh resume)"; fi
  echo "$(basename "$f" .md | grep -oE "^WO-[0-9]{3}[a-z]?") branch=$b tasks[x]=$done_ [ ]=$todo commits=$ahead last=${age}min uncommitted=$dirty => $v"
done
echo; echo "== rate limit signals in sub-agent transcripts (last 60 min) =="
d=$(ls -d /tmp/claude-*/*/*/tasks 2>/dev/null | head -5)
[ -n "$d" ] && find $d -name '*.output' -mmin -60 2>/dev/null | while read -r o; do
  n=$(grep -ciE '"status":? ?429|rate_limit_error|usage limit reached|HTTP 429|Request rejected \(429\)|overloaded_error' "$o"); [ "$n" -gt 0 ] && echo "$(basename "$o") occurrences=$n"; done
exit 0
