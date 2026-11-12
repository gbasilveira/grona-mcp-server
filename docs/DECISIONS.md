# Grona MCP decisions

## 1. INTAKE

Implement a complete MCP interface to the API at https://developer.grona.ai/api/,
add agent conveniences inferred from those operations, document all routes and
helpers, and manage workorders using `/home/gbas/trabalho/foundry-protocol`.
The workspace was empty. No Grona credentials or remote repository were supplied.

## 2. Open questions

None blocking implementation. Live account verification requires a provisioned
Embed/mobile account and remains an explicitly documented validation boundary.

## 3. ADRs

### DR-01 — Official SDK v2 and stdio

**Date:** 2026-11-12.
**Decision:** TypeScript with the official MCP v2 server/client packages, Zod and
Node 22.12+. Expose stdio for a locally spawned trusted workspace process.
**Why:** Typed tool contracts, current SDK support, native fetch and deterministic
protocol tests suit an API adapter without a persistent database.
**Alternatives considered:** Python SDK; a remote HTTP multi-user deployment would
need a separate authentication/tenant design and is not needed for this request.

### DR-02 — Faithful API plus explicit helper workflows

**Date:** 2026-11-12.
**Decision:** One direct tool per documented operation, full upstream envelopes,
separate mobile credential, no automatic PATCH/DELETE retries, and bounded replay
of documented safe operations. Add compositional/local helpers without inventing
missing analytics, content-editing, grant redemption or credential-management APIs.
**Why:** A workspace externalId can be reused after mutation and mobile uses a
separate service. Preserving these semantics matters more than hiding them.

### DR-03 — Foundry workorders with autonomous local execution

**Date:** 2026-11-12.
**Decision:** Bootstrap the requested local Foundry checkout; use bounded executor
workorders and independent command-based review. No human product validation gates
or publishing steps are needed for this local API server implementation.
**Why:** User instructions authorize ordinary implementation decisions and require
end-to-end autonomous completion. Foundry's optional autonomous-loop infrastructure
is unnecessary; the requested workorder management still provides traceability.

### DR-04 — Captured contract and generated documentation

**Date:** 2026-11-12.
**Decision:** Vendor the official OpenAPI snapshot and relevant guide extracts,
generate the complete route/field reference from it, and test operation-to-tool
mapping through the real MCP client.
**Why:** Missing routes and documentation drift become deterministic verification
failures. Captured contracts do not imply live account verification.
