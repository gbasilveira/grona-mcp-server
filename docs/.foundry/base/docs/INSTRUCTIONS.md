# Instructions inbox (user → orchestrator)

> foundry-protocol template. Write new instructions at the end, one entry each, at any time.
> The orchestrator reads this file at the start of every tick (`ORCHESTRATOR-LOOP.md` step 0),
> records each entry as a `USER` log line, turns it into DRs/WOs, and marks it processed
> below the entry. The flow does not stop; only the affected work is re-planned.

## Entries

<!-- Format:
### YYYY-MM-DD — short title
Instruction text.
> processed YYYY-MM-DD — DR-NN / WO-NNN …
-->
