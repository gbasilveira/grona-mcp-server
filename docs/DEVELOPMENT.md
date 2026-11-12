# Architecture and development

## Structure

| Module | Responsibility |
|---|---|
| `src/types.ts` | Typed API envelopes, campaigns, variations and request structures. Responses allow extension fields and future enum values. |
| `src/config.ts` | Environment parsing and service configuration without requiring credentials for local capabilities. |
| `src/schemas.ts` | Zod input validation, including cross-field campaign rules. |
| `src/client.ts` | HTTP requests, service-specific authentication, timeouts, safe retries and sanitized errors. |
| `src/catalog.ts` | Stable tool/route/resource/prompt metadata shared by the server and documentation checks. |
| `src/workflows.ts` | Agent helpers composed from the client and local deterministic computations. |
| `src/server.ts` | Official MCP SDK tool registration, annotations, resources, prompts and error conversion. |
| `src/index.ts` | Stdio executable and clean shutdown. |
| `docs/upstream/` | Captured authoritative API contract and guide text, fetched 2026-11-12. |
| `scripts/generate-api-docs.ts` | Deterministic route and schema reference generation with drift checking. |
| `tests/` | Client, validation, workflow and MCP protocol/integration verification. |

The server is a single trusted workspace process. No database, hidden background jobs, persisted token cache or production credentials are needed to build or test. HTTP base URL overrides are configuration, never tool inputs. Upstream external ids and Grona ids remain opaque strings.

## Verify changes

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run docs:check
bash scripts/check-format-contract.sh
# All normal checks:
npm run verify
# Optional measured coverage:
npm run test:coverage
# Inspect distributable contents without publishing:
npm pack --dry-run
```

The integration suite uses a real stdio subprocess, the official MCP client and a local HTTP listener. All 10 direct operations pass through MCP schema validation and actual HTTP serialization, including mobile credential/host isolation. Unit tests use deterministic fetch/sleep implementations for retry behavior and failure paths. No test mutates a real Grona workspace.

After building, run the same integration test against the packaged entry point:

```bash
GRONA_TEST_ENTRY=dist/index.js npm test -- tests/integration.test.ts
```

CI checks supported Node 22 and 24 using locked dependencies. The npm `prepack` hook builds JavaScript and declarations. The tarball includes the authoritative OpenAPI snapshot and usage reference.

## Updating the Grona contract

1. Capture the official [OpenAPI file](https://developer.grona.ai/openapi/grona-api.yaml) and read the associated guides, particularly conventions, errors and versioning.
2. Open a Foundry WO explicitly authorizing contract changes. Compare paths and request/response fields individually.
3. Update types, validation, HTTP methods, tool registration and `TOOL_CATALOG` together. Keep unknown response fields and values compatible; do not validate responses against closed enums.
4. Add tests for genuinely new behavior, route/auth changes, side effects and boundary conditions. Include relevant sabotage checks for protective tests.
5. Run `npm run docs:generate`, review the generated reference, then `npm run verify` and package smoke checks.
6. Update source capture date and any changed helper behavior in README/agent/operations documentation.

The generated route table fails if any OpenAPI operation lacks a matching MCP equivalent or if an extra direct API tool is absent from the snapshot. `docs:check` fails when documentation drifts. These tests verify the captured contract, not undisclosed endpoints or future changes on Grona's servers.

## Workorder management

This repository uses the requested local [Foundry protocol](../../foundry-protocol/README.md). The canonical workorder state is the queue in `docs/ORCHESTRATION.md`; each WO includes preparation, task markers, scope fences, acceptance criteria, sabotage checks and a self-contained RESULT. Executors use isolated git worktrees. Root reviews results by running commands before accepting them.

```bash
bash scripts/wo.sh status
bash scripts/wo.sh next
bash scripts/wo.sh resume 001
bash scripts/check-format-contract.sh
```

Foundry baseline copies under `docs/.foundry/` allow future framework updates with a three-way merge. Do not hand-edit the baseline copies to hide local protocol changes. Persistent project-specific knowledge belongs in `docs/memory/entries/` and its index. No deployment, remote repository creation, publishing or PR submission is implied by local implementation work.
