#!/usr/bin/env bash
# Original authors and maintainers: αIAt (https://aiat.pt) and Guilherme da Silveira (gbasilveira@gmail.com).
# License: GPL-3.0-or-later — see LICENSE at the repository root.
# Read by the foundry-protocol scripts: loads docs/foundry.conf (KEY=value, without executing the file).
# Usage: source "$(dirname "$0")/_conf.sh"   (defines ROOT, BASE, GATE_PREFIX, VERIFY_CMD, INSTALL_CMD, VERIFY_TMPDIR, GATE_MODE; cd "$ROOT")
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
conf() { sed -n "s/^$1=//p" docs/foundry.conf 2>/dev/null | tail -1; }
BASE="$(conf BASE_BRANCH)"; BASE="${BASE:-main}"
GATE_PREFIX="$(conf GATE_BRANCH_PREFIX)"; GATE_PREFIX="${GATE_PREFIX:-gate/}"
VERIFY_CMD="$(conf VERIFY_CMD)"
INSTALL_CMD="$(conf INSTALL_CMD)"
VERIFY_TMPDIR="$(conf VERIFY_TMPDIR)"
GATE_MODE="$(conf GATE_MODE)"; GATE_MODE="${GATE_MODE:-human}"
WO_ID='[0-9]{3}[a-z]?'
