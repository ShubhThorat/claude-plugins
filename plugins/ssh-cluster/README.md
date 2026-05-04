# SSH Cluster MCP

Claude MCP plugin: mint a short-lived SSH user cert from your API, then run remote commands on your cluster.

## Tools

- `check_connection` — hostname, user, cwd over SSH.
- `run_remote_command` — one line via `bash -lc`.
- `run_remote_script` — multiline script via `bash -s`.

**Luma** (Discover / events / calendars) lives in a **separate** plugin: **`luma-api`** in this marketplace.

## Environment variables

Set in the MCP `env` block or in **`~/.config/ssh-cluster/env.json`** (MCP env overrides the file per key).

### Optional shared deployment

| Variable | Meaning |
|----------|--------|
| `API_SERVER_URL` | Base URL, e.g. `https://your-api.vercel.app` |
| `API_SERVER_HOST` | Host only if you prefer; `https://` added if missing |
| `API_SERVER_KEY` | `X-API-Key` for cert minting |
| `API_KEY` | Used if `API_SERVER_KEY` is empty |

If **`API_SERVER_URL`** (or host) **and** a key are set, you may omit **`SSH_CLUSTER_API_URL`** and **`SSH_CLUSTER_API_KEY`**.

### SSH-specific

| Variable | Required | Notes |
|----------|----------|--------|
| `SSH_CLUSTER_USERNAME` | **Yes** | Path segment for `POST …/ssh/cert:username` |
| `SSH_CLUSTER_API_URL` | No* | Overrides shared base for cert API only |
| `SSH_CLUSTER_API_KEY` | No* | Overrides shared key |
| `SSH_CLUSTER_PORT` | No | Default `22` |
| `SSH_CLUSTER_STRICT_HOST_KEY` | No | Default `true` |
| `SSH_CLUSTER_MAX_OUTPUT_BYTES` | No | Default `262144` |
| `SSH_CLUSTER_DEFAULT_TIMEOUT_MS` | No | Default `120000` |

### Example (`~/.config/ssh-cluster/env.json`)

```json
{
  "API_SERVER_URL": "https://your-api.vercel.app",
  "API_SERVER_KEY": "your-key",
  "SSH_CLUSTER_USERNAME": "yourname"
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
