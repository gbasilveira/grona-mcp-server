#!/usr/bin/env bash
# Original authors and maintainers: αIAt (https://aiat.pt) and Guilherme da Silveira (gbasilveira@gmail.com).
# License: MIT — see LICENSE at the repository root.
# Human validation gates (foundry-protocol, docs/gates/, ORCHESTRATION.md §2.3).
# Usage: scripts/gate.sh status | report NN [--verify] | pr NN | close NN
#   status       gate queue (§4.1)
#   report NN    report of completed operations (markdown, stdout) to paste into GATE-NN
#                --verify also runs VERIFY_CMD from docs/foundry.conf and includes the literal output
#   pr NN        prints (does not run) the gh command to open the gate's PR
#   close NN     autonomous mode only (GATE_MODE=autonomous in docs/foundry.conf): refuses unless every
#                WO of the gate is ACCEPTED and VERIFY_CMD passes on the gate branch; writes the full
#                report to docs/gates/media/GNN/REPORT.md and prints the remaining closing checklist
set -euo pipefail
source "$(dirname "$0")/_conf.sh"
gate_file() { ls docs/gates/GATE-"$1"-*.md 2>/dev/null | head -1; }
gate_branch() { local f; f=$(gate_file "$1"); echo "${GATE_PREFIX}G$1-$(basename "$f" .md | sed -E 's/^GATE-[0-9]{2}-//')"; }
case "${1:-status}" in
  status) grep -E '^\| *G[0-9]{2} *\|' docs/ORCHESTRATION.md | cut -c1-160 || echo "(no gates in §4.1)";;
  report)
    n="${2:?Usage: $0 report NN}"; f=$(gate_file "$n"); [ -n "$f" ] || { echo "GATE-$n does not exist"; exit 1; }
    b=$(gate_branch "$n")
    git rev-parse --verify -q "$b" >/dev/null || { echo "branch $b does not exist"; exit 1; }
    wos=$(sed -n 's/^| *WOs *| *\(.*[^ ]\) *|.*/\1/p' "$f" | head -1 | grep -oE "$WO_ID" || true)
    echo "### Report of completed operations — G$n ($(date -u +%Y-%m-%dT%H:%MZ))"
    echo; echo "Branch \`$b\` @ \`$(git rev-parse --short "$b")\` → base \`$BASE\` @ \`$(git rev-parse --short "$BASE")\`"
    echo; echo "| WO | Title | Status (queue) | Branch | Commits |"; echo "| --- | --- | --- | --- | --- |"
    for id in $wos; do
      row=$(grep -E "^\| *$id *\|" docs/ORCHESTRATION.md | head -1)
      title=$(echo "$row" | awk -F'|' '{gsub(/^ +| +$/,"",$3); print $3}')
      st=$(echo "$row" | awk -F'|' '{gsub(/^ +| +$/,"",$5); print $5}')
      wf=$(ls docs/work-orders/WO-"$id"-*.md 2>/dev/null | head -1)
      wb=$( [ -n "$wf" ] && sed -n 's/^| *Branch *| *`\([^`]*\)`.*/\1/p' "$wf" | head -1 )
      c=$( [ -n "$wb" ] && git rev-parse --verify -q "$wb" >/dev/null && git rev-list --count "$BASE..$wb" || echo "—")
      echo "| $id | ${title:-?} | ${st:-no line} | \`${wb:-?}\` | $c |"
    done
    pend=$(for id in $wos; do grep -E "^\| *$id *\|" docs/ORCHESTRATION.md | grep -qE '\| *ACCEPTED *\|' || echo "$id"; done)
    [ -n "$pend" ] && { echo; echo "**Warning:** WOs not yet ACCEPTED: $(echo $pend)"; }
    echo; echo "#### Commits"; echo '```'; git log --oneline "$BASE..$b"; echo '```'
    echo; echo "#### Files touched"; echo '```'; git diff --stat "$BASE...$b" | tail -40; echo '```'
    if [ "${3:-}" = "--verify" ] && [ -n "$VERIFY_CMD" ]; then
      echo; echo "#### Verification (\`$VERIFY_CMD\` on branch $b)"; echo '```'
      # A fresh worktree has no dependencies: INSTALL_CMD (docs/foundry.conf) runs first; VERIFY_TMPDIR picks
      # where the worktree lives (same filesystem as the package store keeps installs fast).
      wt=$(mktemp -d -p "${VERIFY_TMPDIR:-${TMPDIR:-/tmp}}"); git worktree add -q --detach "$wt" "$b"
      ( cd "$wt" && { [ -z "${INSTALL_CMD:-}" ] || { bash -c "$INSTALL_CMD" 2>&1 | tail -3; }; } && bash -c "$VERIFY_CMD" 2>&1 | tail -40; echo "exit=${PIPESTATUS[0]}" ) || true
      git worktree remove --force "$wt"; echo '```'
    fi;;
  pr)
    n="${2:?Usage: $0 pr NN}"; f=$(gate_file "$n"); [ -n "$f" ] || { echo "GATE-$n does not exist"; exit 1; }
    b=$(gate_branch "$n"); t=$(sed -n '1s/^# *//p' "$f")
    echo "Command to open the PR (confirm with the user first; publishing is an external action):"
    echo "  git push -u origin $b && gh pr create --base $BASE --head $b --title \"$t\" --body-file $f";;
  close)
    n="${2:?Usage: $0 close NN}"; f=$(gate_file "$n"); [ -n "$f" ] || { echo "GATE-$n does not exist"; exit 1; }
    [ "${GATE_MODE:-human}" = "autonomous" ] || { echo "REFUSED: GATE_MODE is '${GATE_MODE:-human}' (close needs autonomous; human gates stop at READY FOR REVIEW)"; exit 1; }
    out="docs/gates/media/G$n/REPORT.md"; mkdir -p "$(dirname "$out")"
    "$0" report "$n" --verify > "$out"
    if grep -q '^\*\*Warning:\*\* WOs not yet ACCEPTED' "$out"; then echo "REFUSED: WOs not ACCEPTED (see $out)"; exit 1; fi
    if [ -n "$VERIFY_CMD" ] && ! grep -qx 'exit=0' "$out"; then echo "REFUSED: verification did not pass (see $out)"; exit 1; fi
    echo "Report written to $out (verification passed)."
    echo "Closing checklist (autonomous gate, ORCHESTRATION.md §2.3):"
    echo "  1. Fill the gate file sections: delivered, deviations, limitations, decisions (with DRs), open questions."
    echo "  2. Write/refresh the gate documentation listed in the gate file (docs are a gate deliverable)."
    echo "  3. Set the gate line in §4.1 to APPROVED; record 'scripts/olog.sh GATE \"G$n closed (autonomous)\"'."
    echo "  4. git merge --no-ff $(gate_branch "$n") into $BASE (no PR needed unless the user asked for one).";;
  *) echo "Usage: $0 status | report NN [--verify] | pr NN | close NN"; exit 1;;
esac
