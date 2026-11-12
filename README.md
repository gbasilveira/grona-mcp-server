# Grona MCP

A TypeScript MCP server for **all 10 operations in the captured [Grona Public API](https://developer.grona.ai/api/) contract**, including the separate mobile grants API. It exposes 10 API tools plus 9 agent helpers, reference resources and reusable prompts over stdio. It uses the official MCP TypeScript SDK v2.

Campaign helpers support discovery, duplicate-safe creation, preview summaries, fresh installation checks, launch, A/B split updates, page-targeting simulation and snippet generation. Direct tools keep Grona's original response envelopes and extension fields.

## Features

### Direct API tools

| Tool | Feature |
|---|---|
| `grona_list_campaigns` | List workspace campaigns. |
| `grona_create_campaign` | Create general or A/B campaigns with page targeting, optional visitor variables and traffic splits. |
| `grona_get_campaign` | Retrieve a campaign by Grona ID or external ID. |
| `grona_update_campaign` | Update supported campaign fields. |
| `grona_delete_campaign` | Permanently delete a campaign. |
| `grona_set_campaign_status` | Publish (`live`) or pause a campaign. |
| `grona_create_edit_link` | Generate a fresh visual editor link for a variation. |
| `grona_validate_edit_link` | Validate/refresh an existing editor link. |
| `grona_verify_script` | Check for the Grona installation snippet on a page. |
| `grona_issue_grants` | Request mobile grants for a customer using the separate mobile service and credential. |

### Workflow and local tools

| Tool | Feature |
|---|---|
| `grona_search_campaigns` | Search names, IDs, external IDs and domains; filter campaign properties, sort and paginate locally. |
| `grona_create_campaign_once` | Create with a stable external ID, conservatively reconcile duplicate conflicts and refresh editor links on verified recovery. |
| `grona_campaign_overview` | Summarize campaign targeting, derived page URL, preview links, blockers and suggested next steps. |
| `grona_check_campaign_readiness` | Check usable variations, A/B split membership and fresh snippet presence; report blockers and manual checks. |
| `grona_launch_campaign` | Recheck readiness and publish after caller edit/preview attestations; report uncertain outcomes for reconciliation. |
| `grona_set_ab_split` | Resolve Control/Test variation IDs and set integer traffic percentages totaling 100%. |
| `grona_evaluate_page_targeting` | Locally simulate specific/multiple-page URL targeting, inclusion/exclusion rules and visitor-variable eligibility. |
| `grona_generate_snippet` | Generate escaped installation HTML, optional visitor-variable assignment and installation instructions. |
| `grona_configuration` | Report credential availability, endpoints, authentication mode, timeouts and retries without exposing secrets. |

### Reference resources

| Resource | Contents |
|---|---|
| `grona://reference/routes` | API route-to-tool mapping. |
| `grona://reference/agent-guide` | Campaign lifecycle, targeting, installation, links and mobile guidance. |
| `grona://reference/errors` | Error codes, replay rules and recovery guidance. |
| `grona://reference/openapi` | Captured Grona OpenAPI specification. |

### Guided prompts

| Prompt | Purpose |
|---|---|
| `grona_campaign_lifecycle` | Installation, creation, editing, preview and launch checklist; accepts an optional campaign ID. |
| `grona_debug_installation` | Diagnose snippet installation issues for a supplied URL. |
| `grona_mobile_integration` | Explain customer identity, separate credentials and grant handling obligations. |

Prompts provide guidance; they do not perform API operations themselves.

### Server capabilities

- MCP stdio transport using the official TypeScript SDK v2.
- Validated input schemas, JSON text and structured results, and tool annotations for reads, mutations and destructive actions.
- Structured errors, recovery guidance and partial-workflow reporting.
- Configurable endpoints, authentication mode, timeouts and retries, with separate Embed/mobile credentials.
- Local tools and static reference resources usable without API credentials.
- TypeScript exports for the server, client, configuration, schemas, workflows and types.

## Grona web app coverage

Public API coverage does not mean full web app coverage. The following describes this server against the API contract captured in this repository; it does not claim that no additional Grona APIs exist.

| Web app section | MCP support |
|---|---|
| Home | No dashboard summary endpoint. |
| Recommendations | Not exposed. |
| Business | Not exposed. |
| Journey | Not exposed. |
| Website | Partial: generate installation snippets and verify snippet presence on a URL. |
| Campaigns | List, create, read, update, delete, publish/pause, editor links, preview summaries, readiness checks and A/B traffic splits. Visual editing happens in Grona's editor. |
| Site health | Partial: snippet verification only; no general site health reports. |
| Heatmaps | Not exposed. |
| Audiences | Partial: campaign targeting using page-variable names/values; no audience management or discovery. |
| Pages | Partial: campaign URL targeting and local targeting simulation; no page inventory or management. |
| Self-optimizing | No dedicated controls or results exposed. |
| Leads | Not exposed. |
| Analytics | Not exposed, including campaign performance and conversion metrics. |
| Integrations | No integration management. |
| Settings | Local MCP configuration diagnostics only; no Grona account/workspace settings management. |

Mobile grant issuance is supported separately from these dashboard sections. The server does not perform visual edits, prove browser script execution, verify shopper identities or redeem grants. Snippet generation does not install it, and readiness checks still require manual browser checks. Supporting additional dashboard sections requires additional documented APIs or another authorized integration mechanism.

## Run locally

Requires Node.js **22.12 or newer**, npm and a Grona API key for network tools. Request an Embed workspace from Grona, then generate the workspace secret under **Settings → Secrets**. Mobile grants access and its key are provisioned separately by Grona.

```bash
npm ci
npm run build
```

Configure an MCP client to spawn the built executable. Replace the absolute path and configure secrets using the client's environment/secret settings:

```json
{
  "mcpServers": {
    "grona": {
      "command": "node",
      "args": ["/absolute/path/to/grona-mcp/dist/index.js"],
      "env": {
        "GRONA_API_KEY": "your-embed-workspace-secret",
        "GRONA_MOBILE_API_KEY": "your-separate-mobile-secret"
      }
    }
  }
}
```

Omit `GRONA_MOBILE_API_KEY` if you only use Embed. See [example client configuration](examples/mcp-config.json). Local tools, resources and prompts work without credentials; an attempted API call reports which key is missing.

For direct launch from a shell with a protected local environment file:

```bash
cp .env.example .env
# Edit .env locally; never commit it.
node --env-file=.env dist/index.js
```

The process speaks MCP JSON-RPC on stdin/stdout and waits for a client; it does not print an interactive prompt. Environment files are loaded by Node's `--env-file` option, not implicitly by the server. The MCP client's `env` settings also work. To develop, use `npm run dev`.

## Documentation

- [Complete API → MCP reference](docs/API.md): every route, input field, cross-field rule, response field and HTTP status, generated from the captured OpenAPI contract.
- [Agent guide](docs/AGENT-GUIDE.md): all helper tools, resources, prompts and workflows, with example arguments.
- [Operations and troubleshooting](docs/OPERATIONS.md): every configuration variable, credentials, retries, errors, privacy, packaging and Docker.
- [Architecture and development](docs/DEVELOPMENT.md): module structure, verification, contract maintenance and Foundry work orders.

## API coverage

| HTTP method | Route | MCP tool |
|---|---|---|
| GET | `/campaigns` | `grona_list_campaigns` |
| POST | `/campaigns` | `grona_create_campaign` |
| GET | `/campaigns/{campaignId}` | `grona_get_campaign` |
| PATCH | `/campaigns/{campaignId}` | `grona_update_campaign` |
| DELETE | `/campaigns/{campaignId}` | `grona_delete_campaign` |
| PATCH | `/campaigns/{campaignId}/status` | `grona_set_campaign_status` |
| POST | `/variations/edit-link` | `grona_create_edit_link` |
| POST | `/variations/edit-link/validate` | `grona_validate_edit_link` |
| POST | `/websites/verify-script` | `grona_verify_script` |
| POST | `/v1/mobile/grants` on `api.grona.ai` | `grona_issue_grants` |

Embed requests use `https://services.grona.ai/api/public/v1`. Mobile requests use `https://api.grona.ai`, always with the mobile credential. Workspace selection comes from each key, never from a tool argument.

## Typical agent use

Start with `grona_configuration` and the workflow reference resource. Search existing campaigns before creating one. Use a stable business `externalId` with `grona_create_campaign_once`. Open the visual editor, save the changes, and check the preview. Then use readiness and launch helpers. New campaigns start paused.

The API exposes no analytics, campaign-result reports, visual-content editing, grant redemption, or key-management endpoints. The server does not invent those operations. Preview/editor links and mobile grants are sensitive; use only trusted MCP clients. See [the Grona reference](https://developer.grona.ai/api/) and [operations guide](docs/OPERATIONS.md).

## Verify

```bash
npm run verify
npm run test:coverage
npm pack --dry-run
```

Tests exercise HTTP behavior through deterministic fakes/local services and MCP protocol calls through the official client. Production credentials are not required. Live Grona account behavior requires a provisioned workspace and is not claimed by these tests.

The [verification record](docs/VERIFICATION.md) includes the final checks and live-account validation boundary.

Workorder management is bootstrapped from [`~/trabalho/foundry-protocol`](../../foundry-protocol/README.md), with the queue in [docs/ORCHESTRATION.md](docs/ORCHESTRATION.md) and results under [docs/work-orders](docs/work-orders).

Copyright (c) 2026 Guilherme da Silveira and contributors.

This implementation is free software under the GNU General Public License, version 3 or (at your option) any later version (SPDX: `GPL-3.0-or-later`). It is provided without warranty; see [LICENSE](LICENSE).

The Foundry scripts are also licensed under GPL-3.0-or-later, with their original author attributions retained. Third-party dependencies retain their respective licenses, as recorded in `package-lock.json`.

Grona reference material in `docs/upstream`, including the proprietary API contract, is excluded from this GPL grant and remains subject to [Grona's terms](https://www.grona.ai/terms). Redistribution permission for that material must be established separately. This license grants no rights to Grona's service or branding.
