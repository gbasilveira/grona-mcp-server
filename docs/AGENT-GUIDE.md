# Agent guide

## Discover the interface

Use MCP `tools/list` to discover the 19 tools and their exact JSON schemas, also captured in [MCP-SCHEMAS.json](MCP-SCHEMAS.json). Direct tools map one-to-one to the 10 routes in [API.md](API.md); the nine conveniences below compose those routes or compute locally. Tool results contain JSON text and `structuredContent`; execution failures set `isError`.

`grona_configuration` takes `{}` and reports which credentials are configured, service URLs and retry/timeout settings without returning secrets or making network calls. Start here to diagnose missing configuration. Network tools check their own credential on demand.

MCP annotations mark reads, mutations and destructive behavior. Publishing a campaign, changing targeting/traffic and deletion affect real visitors; an agent should infer intent from its user's task. The server does not add interactive approval dialogs.

## Direct tool conventions

For create, editor link, validation, installation verification and mobile grants, the tool arguments match the upstream JSON body. Get/delete take `{ "campaignId": "…" }`; list takes `{}`. Status takes `{ "campaignId": "…", "status": "live" }`. Update groups patch fields under `changes`:

```json
{
  "campaignId": "immutable-grona-id",
  "changes": {
    "name": "Returning buyer banner",
    "segmentValue": "loyal_buyer",
    "externalId": null
  }
}
```

`null` clears `externalId`; omitting it leaves it unchanged. URL, type and pageTargeting are fixed at create time. Upstream ignores an update `type`; the server exposes that behavior. Specific campaigns cannot receive multi-page fields, general campaigns cannot receive traffic splits, and a campaign created without a page variable cannot add/remove it through update. Local schemas validate field shapes and known cross-field rules; Grona enforces rules that require current campaign state.

Grona ids are opaque. Get/update/status/delete accept external ids too, but every retry of a mutation must use the immutable Grona id. Dot-only path ids `.` and `..` cannot be safely sent as URL segments by the HTTP client; list campaigns and use that campaign's Grona id instead.

## Search and summarize

### `grona_search_campaigns`

Fetches the complete list once, then filters, sorts and slices locally. This is a convenience over `GET /campaigns`, not upstream pagination.

| Argument | Type / default | Behavior |
|---|---|---|
| `query` | optional string | Case-insensitive substring in name, id, externalId or domain. |
| `status`, `type`, `domain`, `scriptStatus`, `externalId` | optional strings | Exact matches; combined with AND. Domain compares the response's origin string, not a hostname normalization. |
| `sortBy` | `name` | `name`, `createdAt`, `updatedAt` or `id`. |
| `order` | `asc` | `asc` or `desc`; id breaks ties deterministically. |
| `offset` | integer `0` | Local matched-list offset. |
| `limit` | integer `100` | 1–1000 results per response. |

```json
{"query":"breakfast","status":"paused","sortBy":"updatedAt","order":"desc","limit":20}
```

Returns campaigns and metadata with `upstreamCount`, `matchedCount`, returned `count`, `offset`, `limit` and `localPagination: true`. Fetching every campaign may be expensive for large workspaces; there is no upstream pagination in v1.

### `grona_campaign_overview`

Arguments: `{ "campaignId": "CMP-1024" }`. Reads the campaign and returns its full envelope plus an `overview` containing a derived page URL, preview links, broken-variation/A/B-split blockers, suggested next steps and API limitations. It does not mint editor links or report performance metrics.

The page derives from stored `url` for multi-page campaigns, or a variation's preview URL for specific campaigns, with preview query/fragment stripped. Original query-dependent behavior cannot be reconstructed from specific campaign read responses. Retain the URL you used at creation in your own system.

## Duplicate-safe creation

### `grona_create_campaign_once`

Arguments contain the complete create request under `campaign`; `externalId` is required:

```json
{
  "campaign": {
    "name": "Returning buyer delivery bar",
    "url": "https://shop.example.com/",
    "externalId": "CMP-1024",
    "segmentId": "audience_id",
    "segmentValue": "returning_buyer"
  }
}
```

On a successful create it returns the campaign, including editor links, with `recovered: false`. On `409 conflict`, it reads the existing campaign by externalId and compares creation identity before treating it as a retry. It compares name, externalId, page variable, campaign type, targeting mode, page identity, multi-page rules and A/B split when applicable. It does not require status to remain paused: an existing campaign might already have been intentionally launched.

A conflicting or unverifiable campaign returns `create_conflict_mismatch`, with mismatched fields and the existing immutable id. The helper never patches or publishes the existing campaign. For a specific A/B test whose original URL includes a query or fragment, identity cannot be proven from API previews alone; recovery is deliberately refused. Missing usable preview data can also prevent recovery.

For a matching existing campaign it mints fresh editor links for each variation and returns `recovered: true`. Partial link-refresh failure reports `partial_workflow` and `completedSteps`; the existing campaign remains available and individual links can be requested afterward. Treat editor links as secrets, even when the successful result is stored in MCP conversation history.

Use a stable business id for the intended campaign, not a random id on each retry. There is no `Idempotency-Key` header. A 409 alone proves only that an id is occupied.

## Prepare and launch

### `grona_check_campaign_readiness`

Arguments: `{ "campaignId": "CMP-1024" }`. Reads the campaign, derives its associated page, checks usable variations and A/B split membership, then makes a fresh `verify-script` call. Returns:

- `data.campaign`, `pageUrl` and fresh `installation` result;
- `ready`, `blockers` and `manualChecks`;
- an advisory explaining what the API cannot observe.

It refuses to treat an absent, unknown or inaccessible snippet as ready. A missing page or unusable variation blocks launch. An unknown campaign type/targeting mode requires inspection. The stored campaign `script` state alone is insufficient.

Readiness is advisory. A positive snippet check does not prove execution, edited content, consent, CSP or anti-flicker. For specific campaigns the derived verification URL strips preview query/fragment; inspect original query-dependent pages separately. Multi-page campaigns are checked on the sample page, not every matching page. Readiness does not assert that every targeted page is installed.

### `grona_launch_campaign`

```json
{"campaignId":"CMP-1024","edited":true,"previewed":true}
```

Both booleans must literally be `true`, attesting that intended edits were reviewed/saved and intended variations were previewed. These are caller attestations, not API inspection. The helper reruns readiness, then sets `live` using the immutable campaign id it read. A failed readiness check sends no status mutation and returns `not_ready` with blockers and completed steps.

A successful result includes the status envelope, campaign id, verified page, completed steps and propagation note. After an uncertain status request, inspect the campaign by immutable id before retrying. Readiness and status change are separate upstream calls, so another actor can change the campaign between them; Grona exposes no transaction or conditional-write primitive.

Direct `grona_set_campaign_status` and `grona_update_campaign` retain the upstream API's unguarded behavior. To pause intentionally, use the direct status tool with `paused`. Deletion is permanent and releases externalId for reuse.

### A complete lifecycle

1. Obtain the dashboard Embed snippet or generate a starting snippet with `grona_generate_snippet`; install on all target pages with the page variable.
2. Check a representative page with `grona_verify_script`.
3. Search for an existing business campaign; create with `grona_create_campaign_once` and save the returned immutable campaign/variation ids.
4. Mint `grona_create_edit_link` by variation id just before editing; open the returned link and save changes in the visual editor. A held link can be refreshed using `grona_validate_edit_link`.
5. Open each `previewUrl` exactly as returned. Preview ignores targeting, works while paused, does not record campaign page views/conversions, and does not follow navigation to another page. Anyone holding a preview link can see it.
6. Check readiness and manually inspect execution/consent/CSP on actual target pages.
7. Launch with `edited: true` and `previewed: true` only after those actions were completed. Allow propagation time.

## A/B split convenience

### `grona_set_ab_split`

```json
{"campaignId":"CMP-1024","Control":60,"Test":40}
```

Reads the current campaign, requires `abTest` and exactly one usable Control and Test variation, maps their roles to current variation ids, then updates by immutable campaign id. Integers must be 0–100 and total 100. The result is the full updated campaign plus `resolvedRoles`.

On **create**, the raw API takes `trafficSplit: {"Control":60,"Test":40}`; the default is 50/50. On **update**, the raw API requires every variation id as a key and no extra ids. The helper handles that translation. A general campaign has no traffic split.

## Simulate targeting locally

### `grona_evaluate_page_targeting`

This tool sends no network requests. Supply the original creation URL and candidate pages:

```json
{
  "url": "https://shop.example.com/dairy/whole-milk",
  "type": "abTest",
  "pageTargeting": "multiple",
  "slug": "dairy",
  "condition": "included",
  "list": ["dairy", "bakery"],
  "urls": [
    "https://shop.example.com/bakery/bread",
    "https://shop.example.com/bakery",
    "https://other.example.com/dairy/whole-milk"
  ],
  "segmentId": "audience_id",
  "segmentValue": "breakfast_shopper",
  "pageVariables": {"audience_id":"breakfast_shopper"}
}
```

| Argument | Rules |
|---|---|
| `url` | Required absolute HTTP(S) original sample URL. |
| `urls` | Required 1–1000 candidate absolute HTTP(S) URLs. |
| `type` | `general` default, or `abTest`. |
| `pageTargeting` | `specific` default, or `multiple`. |
| `slug`, `list` | Required for `multiple`; slug must exactly occur in sample URL path; list has 1–50 entries of 1–200 characters. |
| `condition` | `included` default, or `not_included`. |
| `segmentId`, `segmentValue` | Optional as a pair; same page-variable rules as create. |
| `pageVariables` | Optional map of variable names to string values for this simulated visitor. |

Returns one result per candidate: `pageMatches`, `segmentMatches`, `eligible` and a reason. Multi-page results also identify the compared segment and zero-based position. If page-variable targeting was supplied but visitor variables were omitted, a matching page has `eligible: null` because the visitor match is unknown. A false page match always means ineligible.

Multi-page matching requires exact origin and equal path segment count, then compares the segment at slug's position case-sensitively. This remains true for `not_included`: an exclusion never widens the origin or path-depth boundary. A general specific campaign ignores query string; a specific A/B test compares the full supplied URL conservatively, including query/fragment. This helper predicts URL/variable eligibility; it does not execute the SDK, choose a variation, account for consent or measure campaign results.

Website host normalization is a separate concept: verification/website association ignores leading `www.` and case, but targeting still requires the actual matching origin. `https://shop.example.com` and `https://www.shop.example.com` are different origins for targeting.

## Generate installation HTML

### `grona_generate_snippet`

```json
{"workspaceId":"your_workspace_id","segmentId":"audience_id","segmentValue":"returning_buyer"}
```

`workspaceId` is required; get it from an API response's `meta.workspaceId` or the dashboard. This helper accepts a 1–128 character workspace id containing letters, digits, `_` or `-`. Page-variable name/value are optional as a pair. It returns escaped Embed HTML, optional `window[...]` assignment, and installation instructions. It installs nothing and requires no key.

Copy the dashboard snippet when anti-flicker is enabled; the generated HTML cannot infer that workspace setting. Place it in `<head>` on every target template. Use `grona_verify_script` afterward and inspect execution/consent/CSP manually. Browser global names such as `location`, `name` and `status` are invalid targeting variables; use a custom name such as `audience_id`.

## MCP resources

| Resource URI | Contents |
|---|---|
| `grona://reference/routes` | Route-to-direct-tool map. |
| `grona://reference/agent-guide` | Compact lifecycle, targeting, installation, links and mobile guidance. |
| `grona://reference/errors` | Stable error codes, replay rules and recovery. |
| `grona://reference/openapi` | Captured authoritative OpenAPI 3.1 YAML. |

Resources are static and readable without keys. For the full human reference see this guide and [API.md](API.md).

## MCP prompts

| Prompt | Arguments | Purpose |
|---|---|---|
| `grona_campaign_lifecycle` | optional `campaignId` | Installation → editing → preview → launch checklist using the actual tools. |
| `grona_debug_installation` | `url` | Diagnose absent snippets on one page, including wrong product/workspace, consent, rewriting, delay and access restrictions. |
| `grona_mobile_integration` | none | Server-session customer identity, separate credentials and grant/order obligations. |

Use MCP `prompts/get` with the listed arguments. Prompts produce guidance; they do not make API calls, launch campaigns, verify identities or redeem grants on their own.
