---
name: api-boundaries
description: Grona Embed and mobile grant API boundaries, replay rules and captured contract.
metadata:
  type: project
---

The captured Grona API has 10 operations: nine Embed operations on services.grona.ai
and one mobile grant fetch on api.grona.ai with a separate secret. It has no API
for analytics, variation-content editing, redemption or key management.

**Why:** Agents can otherwise infer unsupported operations or mix credentials.
External ids can be reused after updates/deletes, making mutation retries hazardous.

**How to apply:** Consult the captured OpenAPI and generated API reference before
extending tools. Preserve future response fields/enums, keep mobile credentials
isolated, and use immutable Grona ids for any manual mutation recovery.
