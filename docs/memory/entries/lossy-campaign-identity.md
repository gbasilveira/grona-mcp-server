---
name: lossy-campaign-identity
description: Why specific A/B create-once conflict recovery cannot prove exact original URL identity.
metadata:
  type: decision
---

Specific campaign reads omit original creation `url`; preview URLs contain undocumented
access parameters. Stripping those parameters loses the distinction between the campaign's
original targeting query and preview parameters, even when a new request has no query.

**Why:** A helper could falsely recover a conflicting externalId as the same intended A/B
test when the existing test actually targets a different exact URL. Tests with only plain
paths missed this asymmetry; adversarial review produced corrective WO-002b.

**How to apply:** Refuse automatic recovery for specific A/B conflicts. Retain the original
creation URL in the caller's system and reconcile explicitly through direct tools. General
campaigns ignore queries; multi-page campaigns return stored URL and can be compared.
