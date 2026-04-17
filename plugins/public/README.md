# Public.com Claude plugin

Production-ready Claude plugin for Public.com using the official MCP server directly:

- MCP server: `publicdotcom-mcp-server`

## What this plugin provides

- `.mcp.json` wired directly to `uvx publicdotcom-mcp-server`
- `skills/public-trading` for structured trade workflows
- `skills/options-spread-builder` for spread construction and preflight packets
- `agents/trade-planner` for building executable plans
- `agents/risk-checker` for pre-execution validation
- `agents/options-spread-screener` for ranked spread candidates
- `agents/portfolio-risk-analyst` for account-level risk diagnostics

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

## Skills and agents

This plugin now includes official-style extensions:

- Skill: `public-trading`
  - Activates for trade planning, position management, and order workflows.
- Agent: `trade-planner`
  - Produces structured entry/exit/risk plans and preflight-ready parameters.
- Agent: `risk-checker`
  - Runs a final validation pass before destructive order actions.
- Skill: `options-spread-builder`
  - Designs spread candidates and outputs preflight-ready parameters.
- Agent: `options-spread-screener`
  - Ranks spread setups across risk levels with trade-off explanations.
- Agent: `portfolio-risk-analyst`
  - Audits concentration/exposure and proposes staged de-risking plans.

## References

- [Public.com MCP Server](https://github.com/PublicDotCom/publicdotcom-mcp-server)
