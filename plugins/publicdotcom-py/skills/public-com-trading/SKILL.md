---
name: public-com-trading
description: Use Public.com MCP tools for quotes, portfolio checks, and cautious trading workflows.
version: 1.0.0
---

# Public.com Trading Workflow

Use this skill when users want to inspect Public.com account data, market quotes, options data, or place/cancel orders through MCP tools.

## Safety defaults

- Start with read-only tools (`check_setup`, `get_accounts`, `get_portfolio`, `get_quotes`, `get_option_chain`) before any write action.
- Before calling write tools (`place_order`, `place_multileg_order`, `cancel_order`, `cancel_and_replace_order`), restate the intended action and critical parameters.
- Never infer missing trade-critical parameters. Ask for explicit confirmation when symbol, side, quantity, or order type is ambiguous.

## Typical sequence

1. `check_setup`
2. `get_accounts` (if account not known)
3. `get_quotes` or `get_option_chain`
4. `preflight_order` / `preflight_multileg_order`
5. `place_order` or `place_multileg_order` (only when user clearly requests)
6. `get_order` to verify status
