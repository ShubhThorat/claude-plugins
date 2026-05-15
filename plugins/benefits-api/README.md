# API Server MCP

Fetches `/openapi.json` from `https://api.shubhthorat.com` at startup and **auto-registers one MCP tool per GET endpoint**. Adding a new endpoint to the server automatically makes it available here — no plugin changes needed.

Requires an `X-API-Key` for protected endpoints.

## How it works

On start, the plugin hits `/openapi.json`, reads every GET operation, and wires up a tool using:

- **name** — `operationId` from the spec (e.g. `getVisionPlan`, `lumaEventsNear`)
- **description** — `summary` from the spec
- **parameters** — path and query params, typed from the spec (`string`, `number`, `boolean`, required vs optional)

Your API key permissions control what actually succeeds at call time.

## Environment

| Variable | When to set |
|----------|-------------|
| `BENEFITS_API_KEY` | API key with the relevant permissions (**required** for protected routes) |
| `API_SERVER_KEY` / `API_KEY` | Alternative shared key names |
| `BENEFITS_API_URL` | Different base than `https://api.shubhthorat.com` |
| `API_SERVER_URL` / `API_SERVER_HOST` | Same, if you prefer shared naming |

Persistent file (optional): `~/.config/benefits-api/env.json` — same keys; process env wins per key.

## Setup

```bash
cd server && npm install && npm run build
```

`/reload-plugins` after install or rebuild.
