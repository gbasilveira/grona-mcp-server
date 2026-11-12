#!/usr/bin/env bash
# Original authors and maintainers: αIAt (https://aiat.pt) and Guilherme da Silveira (gbasilveira@gmail.com).
# License: GPL-3.0-or-later — see LICENSE at the repository root.
# Usage: scripts/olog.sh <TYPE> "text"
#   TYPE: LAUNCH|RESULT|REVIEW|MERGE|DECISION|WATCHDOG|RELAUNCH|USER|GATE|NOTE
# Curated, append-only, committed log: who did what, to whom, with what result.
set -euo pipefail
source "$(dirname "$0")/_conf.sh"
case "${1:-}" in LAUNCH|RESULT|REVIEW|MERGE|DECISION|WATCHDOG|RELAUNCH|USER|GATE|NOTE) ;;
  *) echo "invalid type: '${1:-}'" >&2; exit 1;; esac
[ -n "${2:-}" ] || { echo "missing text" >&2; exit 1; }
f="$ROOT/docs/orchestration-log/LOG.md"; mkdir -p "$(dirname "$f")"
[ -f "$f" ] || printf '# Orchestrator log (append-only; everything launched, received and decided)\n\n' > "$f"
printf -- '- %s · **%s** · %s\n' "$(date -u +%Y-%m-%dT%H:%MZ)" "$1" "$(printf '%s' "$2" | tr '\n' ' ')" >> "$f"
