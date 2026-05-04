# Luma API MCP

Separate MCP from **ssh-cluster**: read-only calls to your deployment’s **`GET /api/luma/*`** routes (Discover, paginated events, calendar items, full calendar). Uses **`X-API-Key`** only — no SSH.

## Tools

- `luma_discover` — compact Discover JSON + summary.
- `luma_events_by_place` — events by `discover_place_api_id`.
- `luma_events_by_category` — events by category slug + lat/lon.
- `luma_calendar_items` — slim upcoming rows for a `calendar_api_id`.
- `luma_calendar_full` — full `calendar/get` payload (large).

Your API key must allow **`/api/luma`** (or `["*"]`) on the server.

## Environment variables

Set in the MCP `env` block or **`~/.config/luma-api/env.json`** (process env wins per key).

### Optional common deployment

| Variable | Meaning |
|----------|--------|
| `API_SERVER_URL` | Base URL, e.g. `https://your-api.vercel.app` |
| `API_SERVER_HOST` | Host only; `https://` added if missing |
| `API_SERVER_KEY` | `X-API-Key` |
| `API_KEY` | Fallback if `API_SERVER_KEY` is empty |

When **`API_SERVER_URL`** (or host) **and** a key are set, you may omit **`LUMA_API_URL`** and **`LUMA_API_KEY`**.

### Luma-specific overrides

| Variable | Notes |
|----------|--------|
| `LUMA_API_URL` | Base URL for these tools only |
| `LUMA_API_KEY` | Key for Luma only |

### Example

```json
{
  "API_SERVER_URL": "https://your-api.vercel.app",
  "API_SERVER_KEY": "your-key"
}
```

## Setup

1. Configure env (above).
2. `/reload-plugins` in Claude Code.

Rebuild after editing `server/index.js`:

```bash
cd server && npm install && npm run build
```

## Local development

```bash
cd server
npm install
npm run build
npm start
```
