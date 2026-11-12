# Verification record

Date: 2026-11-12. API source: https://developer.grona.ai/api/ and captured official
OpenAPI 3.1 contract, version 1.0.0. See `docs/upstream/SOURCE.json` for provenance/hash.

| Check | Result |
|---|---|
| TypeScript strict typecheck | Passed. |
| Full test suite | 157 tests passed in 5 files. |
| JavaScript/declaration build | Passed. |
| API/MCP documentation consistency | Passed: 10 routes, 19 tools. |
| Foundry format contract | Passed with zero violations and zero warnings after closure. |
| Clean npm package installation | Production dependencies only; 28 packaged files inspected. |
| Installed-package stdio integration | 17 tests passed through official MCP client and local HTTP mock. |
| Docker image build | Passed using Node 22 Alpine, unprivileged runtime user. |
| Final Docker stdio smoke | Passed: 19 tools, OpenAPI resource, offline configuration. |
| Production dependency audit | Zero known vulnerabilities reported by npm audit. |
| Documentation local links | All links in README/API/agent/operations/development resolve. |

The integration tests send all ten direct routes through a real stdio subprocess and
HTTP serialization to a local mock, verify separate mobile credentials, preserve extension
fields, exercise lifecycle helpers, discover all resources/prompts, reject invalid inputs
without requests, and verify offline startup/configuration diagnostics.

Protective sabotage checks detected unsafe-create retries, mobile credential fallback,
missing exact-origin matching, false specific A/B identity recovery, discarded definite
launch rejections, and an incorrect mobile route mapping in documentation. All mutants
were restored and relevant checks passed again.

No live Grona credentials were supplied, no authenticated production calls were made,
and no real campaigns were created, launched or deleted. Workspace access, plan limits,
actual installation checks, visual editing, preview rendering and mobile entitlement
behavior need a provisioned account for live validation. Successful local mocks are not
claimed as production-account verification.

The API does not expose original URL on specific campaign reads, saved variation edits,
results/analytics, grant redemption or key management. Readiness cannot prove consent,
CSP, script execution or saved edits. Specific A/B create conflicts require reconciliation
against independently retained creation records. See `AGENT-GUIDE.md` and `OPERATIONS.md`.
