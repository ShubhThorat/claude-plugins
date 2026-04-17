# Public.com Claude plugin

Production-ready Claude plugin for Public.com using the official MCP server directly:

- MCP server: `publicdotcom-mcp-server`

## What this plugin provides

- `.mcp.json` wired directly to `uvx publicdotcom-mcp-server`
- A built-in skill for safe quote/portfolio/trading workflows

## Prerequisites

- Public.com API credentials
  - `PUBLIC_COM_SECRET` (required)
  - `PUBLIC_COM_ACCOUNT_ID` (optional but recommended)
- `uvx` installed locally

## Setup

Set environment variables in your shell/profile (or in plugin/local env management):

```bash
export PUBLIC_COM_SECRET="your_api_secret_key"
export PUBLIC_COM_ACCOUNT_ID="your_account_id"
```

## Usage in Claude

After installing/reloading plugins, Claude can call MCP tools such as:

- Read-only: `check_setup`, `get_accounts`, `get_portfolio`, `get_quotes`, `get_option_chain`
- Write/destructive: `place_order`, `place_multileg_order`, `cancel_order`, `cancel_and_replace_order`

Recommended workflow:

1. Validate setup with `check_setup`
2. Pull account and quote context
3. Run preflight tools before any order placement
4. Place/cancel orders only with explicit user confirmation

## References

- [Public.com MCP Server](https://github.com/PublicDotCom/publicdotcom-mcp-server)
