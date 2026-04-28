# SSH Cluster Plugin

Generic SSH cluster integration for Claude using a custom MCP wrapper. This plugin lets Claude execute shell commands and scripts on any SSH-accessible machine, including HPC and GPU clusters.

## Tools

- `check_connection`: Validate SSH access and return hostname/user/working directory.
- `run_remote_command`: Execute a one-line command using `bash -lc`.
- `run_remote_script`: Execute a multiline script via `bash -s`.

## Environment Variables

Set these in Claude/plugin env before starting:

- `SSH_CLUSTER_HOST`: required; either `user@host` or an SSH config alias.
- `SSH_CLUSTER_PORT`: optional; default `22`.
- `SSH_CLUSTER_KEY_PATH`: optional; private key path.
- `SSH_CLUSTER_STRICT_HOST_KEY`: optional; `true` by default.
- `SSH_CLUSTER_MAX_OUTPUT_BYTES`: optional; max total stdout+stderr bytes (default `262144`).
- `SSH_CLUSTER_DEFAULT_TIMEOUT_MS`: optional; default command timeout in ms (default `120000`).

## Setup

### 1. Add an SSH config alias (recommended)

Add an entry to `~/.ssh/config`:

```
Host my-cluster
  HostName login.mycluster.edu
  User myusername
  IdentityFile ~/.ssh/id_rsa
```

### 2. Set `SSH_CLUSTER_HOST` in Claude settings

Add to `~/.claude/settings.json` under the `env` key — this persists across plugin reinstalls:

```json
{
  "env": {
    "SSH_CLUSTER_HOST": "my-cluster"
  }
}
```

Or use a full `user@host` string instead of an alias:

```json
{
  "env": {
    "SSH_CLUSTER_HOST": "myusername@login.mycluster.edu"
  }
}
```

### 3. Reload plugins

Run `/reload-plugins` in Claude Code. No install step required — the server is pre-bundled.

## Local Development

```bash
cd server
npm install
npm run build   # rebuilds server/bundle.js
npm start
```
