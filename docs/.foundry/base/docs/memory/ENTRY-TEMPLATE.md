<!--
Template for an entry in docs/memory/entries/<slug>.md — same shape used in the
Claude Code personal memory system (the memory/*.md files of a Claude Code project), so that any
reader (human, future session, or the Phase 2 macro-agent) processes both with the
same habit.

Create ONE file per fact/decision/lesson, not a single log that grows forever — that
is what docs/memory/MEMORY.md (the index) is for.
-->
---
name: {{slug-kebab-case}}
description: {{one line, specific, used to decide relevance in future conversations}}
metadata:
  type: {{project | decision | incident | reference}}
---

{{Fact or decision in 1-3 sentences.}}

**Why:** {{the motivation — what produced it: a request, a constraint, an incident}}
**How to apply:** {{when this should change the behavior of a future session}}

<!--
If this entry references an image (screenshot, diagram, mockup): store it in
docs/memory/media/{{slug-kebab-case}}/ and reference it by relative path, e.g.
![caption](../media/{{slug-kebab-case}}/file.png)
Single convention — do not decide the location case by case.
-->
