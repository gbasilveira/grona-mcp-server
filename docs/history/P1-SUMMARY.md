# P1 — Complete Grona MCP implementation

Closed 2026-11-12. Source: official Grona API/OpenAPI captured on that date.

Delivered 10 direct API tools, 9 compositional/local helpers, 4 resources and 3 prompts
using the official MCP SDK v2 and stdio. Embed and mobile credentials are isolated;
requests validate inputs, retain full response envelopes/extensions, time out and
retry only safe operations. No automatically replayed PATCH/DELETE calls.

The agent helpers cover search, duplicate-safe create/recovery, overview, readiness,
launch, A/B role split mapping, page-targeting simulation, snippet generation and
configuration diagnostics. Specific A/B conflict recovery refuses unprovable original
URL identity; known launch rejections retain upstream code/status and uncertain
failures report reconciliation steps.

Documentation includes the complete generated route/field/status reference, exact
MCP schema manifest, agent workflows, configuration/error/security/packaging guides,
README, verification record and executable client/Docker examples. CI supports Node
22 and 24. No remote publishing/deployment was performed.

Accepted WOs: 001 (client), 002 (MCP/workflows), 002b (review corrections),
003 (docs/integration/package verification). Final results: 157 tests passed across
5 files; typecheck, build, doc drift and Foundry checks passed. Clean production-only
npm installation passed 17 real stdio/HTTP integration tests; Docker build/stdio smoke
and dependency audit passed. See `docs/VERIFICATION.md` and individual WO RESULTs.

No live Grona credentials were provided. Actual account entitlements, browser editing,
installation and grant behavior remain live-account validation boundaries, documented
without blocking this implementation. Novel lesson about lossy retry identity was
appended as #35 to the requested local foundry-protocol lesson ledger.
