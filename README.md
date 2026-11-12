# Grona MCP

A TypeScript MCP server for **every operation in the [Grona Public API](https://developer.grona.ai/api/)**, including the separate mobile grants API. It exposes 10 API tools plus 9 agent helpers, reference resources and reusable prompts over stdio. It uses the official MCP TypeScript SDK v2.

Campaign helpers support discovery, duplicate-safe creation, preview summaries, fresh installation checks, launch, A/B split updates, page-targeting simulation and snippet generation. Direct tools keep Grona's original response envelopes and extension fields.

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

MIT for this implementation. Third-party Grona reference material retains Grona's terms; see [LICENSE](LICENSE).
