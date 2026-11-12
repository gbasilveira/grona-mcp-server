# Restart prompt — Grona MCP

Project is complete as of 2026-11-12. Speak English unless the user prefers otherwise.
All workorders (001, 002, 002b, 003) are accepted; no pending gate or required work.

1. Read `git status --short`, `docs/ORCHESTRATION.md`, `docs/DR-INDEX.md`,
   `docs/history/P1-SUMMARY.md` and `docs/memory/MEMORY.md`.
2. Consult `src/CONTEXT.md`, README, generated API/schema reference and agent guide.
3. Canonical setup/check: `npm ci` then `npm run verify`. Final baseline was 157
   passing tests, build/typecheck/docs/Foundry clean. Installed-package integration
   and Docker stdio smoke also passed. No real Grona keys or production calls were used.
4. Preserve API snapshot intentionally. Keep separate mobile host/key, no automatic
   mutation replay, no false specific A/B identity from stripped preview URLs.
5. If the user requests new work, write a bounded Foundry WO, implement, verify by
   command and update queue/log/memory. Do not publish or push without authorization.

Known limits are in `docs/VERIFICATION.md`: no analytics/content-editing/redemption/key
management endpoints; readiness does not prove edits/execution/consent/CSP. Live-account
validation requires provisioned credentials outside chat.
