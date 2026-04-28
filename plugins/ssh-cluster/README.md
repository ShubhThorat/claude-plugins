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

## Auth Mode A: Explicit Key Path

```bash
SSH_CLUSTER_HOST=thorat.shu@login.explorer.northeastern.edu
SSH_CLUSTER_KEY_PATH=~/.ssh/id_rsa
SSH_CLUSTER_PORT=22
SSH_CLUSTER_STRICT_HOST_KEY=true
```

## Auth Mode B: SSH Config Alias

Use a host entry in `~/.ssh/config`, then set only:

```bash
SSH_CLUSTER_HOST=my-cluster-alias
SSH_CLUSTER_STRICT_HOST_KEY=true
```

## Local Server Setup

From this plugin directory:

```bash
cd server
npm install
npm start
```
