# Grona MCP source context

- Official MCP SDK v2 server, local stdio, Node >=22.12, TypeScript ESM.
- `client.ts` handles all 10 operations; mobile host and key are separate.
- `schemas.ts` validates requests. Responses preserve extra fields and future enums.
- `workflows.ts` adds agent conveniences; `server.ts` exposes tools/resources/prompts.
- `catalog.ts` feeds documentation and operation coverage assertions.
- No API for analytics, editing variation content, grant redemption or key management.
- Full list responses have no pagination; do filtering/sorting locally.
- Creates start paused; externalId is the create idempotency mechanism.
- Never replay PATCH/DELETE automatically, especially with reusable externalId.
- Editor/preview URLs and grant tokens are sensitive outputs.
- Source of truth: `docs/upstream/grona-api.yaml` and guide text fetched 2026-11-12.
- Verify: `npm run verify`; coverage: `npm run test:coverage`.
- Workorders: `docs/ORCHESTRATION.md`; design choices: `docs/DR-INDEX.md`.
