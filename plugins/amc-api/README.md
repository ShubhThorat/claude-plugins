# AMC API MCP

Calls **`GET https://api.shubhthorat.com/api/amc/*`** by default — **no API key required**. Set **`AMC_COOKIE`** (or **`X-Amc-Cookie`** via your proxy) when Queue-it blocks or when fetching **seats**.

## Tools

- `amc_theatres` — theatre search / listing (`q`, `page_url`, `verbose`, `timeout`).
- `amc_showtimes` — venue or movie showtimes (`url`, or `region`+`slug`, or `movie`; optional `date`, `premium_offering`).
- `amc_seats` — seat map for a numeric **`showtime_id`** (cookie usually required).

## Environment (optional)

| Variable | When to set |
|----------|-------------|
| `AMC_API_URL` | Different base than `https://api.shubhthorat.com` |
| `API_SERVER_URL` / `API_SERVER_HOST` | Same, shared naming with other plugins |
| `AMC_COOKIE` / `AMC_API_COOKIE` | Browser session cookie → `X-Amc-Cookie` |
| `API_SERVER_KEY` / `API_KEY` | Only if your proxy requires `X-API-Key` |

Persistent file (optional): `~/.config/amc-api/env.json` — same keys; process env wins per key.

## Setup

`/reload-plugins` after install. Rebuild after editing `server/index.js`:

```bash
cd server && npm install && npm run build
```
