# `<package>` — context for agents (≤ 45 lines; read this instead of `src/`)

> foundry-protocol template (from a multi-agent project). Copy to `packages/<p>/CONTEXT.md`
> when the package is created. The WO that changes the public API or the package's
> invariants updates this file **in the same commit**. An agent reads this file, not
> the source code, unless its WO tells it to open the source.

`<1–3 sentences: what the package is for, what it depends on, what it never does>`

- **Public API:** `<exported functions/types, with a short signature>`
- **Invariants:** `<what is always true; errors returned and the order of checks>`
- **Limits:** `<sizes, counts, timeouts>`
- **Tests:** `<command; what the security tests cover; which are baseline and are not edited>`
- **DRs:** `<DR-NN, DR-MM>`
- **Outside this package, on purpose:** `<what belongs elsewhere>`
