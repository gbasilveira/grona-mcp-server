#!/usr/bin/env bash
# Original authors and maintainers: αIAt (https://aiat.pt) and Guilherme da Silveira (gbasilveira@gmail.com).
# License: MIT — see LICENSE at the repository root.
# Usage: scripts/check-format-contract.sh
# Checks the shapes listed in docs/FORMAT-CONTRACT.md (foundry-protocol).
# Exits with 1 on any violation; differences between header and queue are only warnings.
set -uo pipefail
source "$(dirname "$0")/_conf.sh"

STATES='DRAFT|READY|IN PROGRESS|IN REVIEW|ACCEPTED|CHANGES REQUESTED|DONE|PARTIAL|BLOCKED'
GATE_STATES='DRAFT|OPEN|READY FOR REVIEW|APPROVED|CHANGES REQUESTED'
LOG_TYPES='LAUNCH|RESULT|REVIEW|MERGE|DECISION|WATCHDOG|RELAUNCH|USER|GATE|NOTE'
errors=0
warnings=0
fail() { echo "FAIL  $*"; errors=$((errors + 1)); }
warn() { echo "warn  $*"; warnings=$((warnings + 1)); }
trim() { echo "$1" | sed -E 's/^ +//; s/ +$//'; }

# WO queue: id -> status (rule 3)
declare -A queue_state
while IFS='|' read -r _ id _ _ state _; do
  id="$(trim "$id")"; state="$(trim "$state")"
  [ -n "$id" ] && queue_state["$id"]="$state"
done < <(grep -E "^\| *$WO_ID *\|" docs/ORCHESTRATION.md)

for id in "${!queue_state[@]}"; do
  row="$(grep -E "^\| *$id *\|" docs/ORCHESTRATION.md | head -1)"
  cols="$(echo "$row" | awk -F'|' '{print NF - 2}')"
  [ "$cols" -eq 6 ] || fail "queue line $id has $cols columns (expected 6)"
  echo "${queue_state[$id]}" | grep -qE "^($STATES)\$" \
    || fail "queue line $id has unknown status '${queue_state[$id]}'"
done

# WO files (rules 1 and 2)
shopt -s nullglob
for f in docs/work-orders/*.md; do
  base="$(basename "$f")"
  [ "$base" = "TEMPLATE.md" ] && continue
  if ! echo "$base" | grep -qE '^WO-[0-9]{3}[a-z]?-[a-z0-9-]+\.md$'; then
    fail "$base: name does not match WO-NNN[a-z]-<slug>.md"; continue
  fi
  id="$(echo "$base" | sed -E 's/^WO-([0-9]{3}[a-z]?)-.*/\1/')"
  for key in Phase Status "Depends on" Branch; do
    grep -qE "^\| *$key *\|" "$f" || fail "$base: missing header line '$key'"
  done
  est="$(sed -n 's/^| *Status *| *\(.*[^ ]\) *|.*/\1/p' "$f" | head -1)"
  echo "$est" | grep -qE "^($STATES)( |\$)" || fail "$base: Status '$est' does not start with a known status"
  if [ -z "${queue_state[$id]+x}" ]; then
    fail "$base: no line for $id in the queue of ORCHESTRATION.md"
  else
    first="$(echo "$est" | grep -oE "^($STATES)" | head -1)"
    [ "$first" = "${queue_state[$id]}" ] \
      || warn "$base: header says '$first', queue says '${queue_state[$id]}' (the queue is canonical)"
  fi
done

# Queue lines other than DRAFT need a file (rule 3)
for id in "${!queue_state[@]}"; do
  [ "${queue_state[$id]}" = "DRAFT" ] && continue
  compgen -G "docs/work-orders/WO-$id-*.md" >/dev/null \
    || fail "queue line $id is ${queue_state[$id]} but has no WO file"
done

# Gates (rule 6)
declare -A gate_state
while IFS='|' read -r _ id _ _ state _; do
  id="$(trim "$id")"; state="$(trim "$state")"
  [ -n "$id" ] && gate_state["$id"]="$state"
done < <(grep -E '^\| *G[0-9]{2} *\|' docs/ORCHESTRATION.md)
for id in "${!gate_state[@]}"; do
  row="$(grep -E "^\| *$id *\|" docs/ORCHESTRATION.md | head -1)"
  cols="$(echo "$row" | awk -F'|' '{print NF - 2}')"
  [ "$cols" -eq 6 ] || fail "gate line $id has $cols columns (expected 6)"
  echo "${gate_state[$id]}" | grep -qE "^($GATE_STATES)\$" || fail "gate $id has unknown status '${gate_state[$id]}'"
  [ "${gate_state[$id]}" = "DRAFT" ] && continue
  compgen -G "docs/gates/GATE-${id#G}-*.md" >/dev/null || fail "gate $id is ${gate_state[$id]} but has no file"
done
for f in docs/gates/*.md; do
  base="$(basename "$f")"
  [ "$base" = "TEMPLATE.md" ] && continue
  echo "$base" | grep -qE '^GATE-[0-9]{2}-[a-z0-9-]+\.md$' || { fail "$base: name does not match GATE-NN-<slug>.md"; continue; }
  for key in Phase Status WOs PR; do
    grep -qE "^\| *$key *\|" "$f" || fail "$base: missing header line '$key'"
  done
  gid="G$(echo "$base" | sed -E 's/^GATE-([0-9]{2})-.*/\1/')"
  [ -n "${gate_state[$gid]+x}" ] || fail "$base: no line for $gid in the gate queue (§4.1)"
done

# Orchestration log (rule 5)
log=docs/orchestration-log/LOG.md
if [ -f "$log" ]; then
  n=0
  while IFS= read -r line; do
    n=$((n + 1))
    case "$line" in ''|'#'*) continue ;; esac
    echo "$line" | grep -qE "^- [0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}Z · \*\*($LOG_TYPES)\*\* · " \
      || fail "$log:$n: line does not follow the log format"
  done < "$log"
fi

echo "---"
echo "$errors violation(s), $warnings warning(s)"
[ "$errors" -eq 0 ]
