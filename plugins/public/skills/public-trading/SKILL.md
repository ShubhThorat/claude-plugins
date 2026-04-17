---
name: public-trading
description: Use this skill when the user asks to analyze a ticker, build a trade plan, compare option setups, manage an existing position, or place/cancel Public.com orders via MCP.
version: 1.0.0
---

# Public Trading Skill

Use this skill to keep trading workflows structured and safe when using Public.com MCP tools.

## Default workflow

1. Verify setup with `check_setup`.
2. Gather context (`get_accounts`, `get_portfolio`, `get_quotes`, `get_option_chain`).
3. Run preflight (`preflight_order` or `preflight_multileg_order`) before any order.
4. Ask for explicit confirmation before destructive actions.
5. Execute order tool only after confirmation.
6. Verify status with `get_order` and summarize outcome.

## Safety rules

- Never place or cancel orders on implied intent.
- Require explicit values for symbol, side, quantity, order type, and (when relevant) price/expiration.
- If user goals are ambiguous, propose options and ask for confirmation.
- Treat trading output as execution assistance, not investment advice.

## Useful tool mapping

- Discovery: `get_quotes`, `get_instrument`, `get_option_expirations`, `get_option_chain`
- Position review: `get_portfolio`, `get_orders`, `get_history`
- Execution prep: `preflight_order`, `preflight_multileg_order`
- Execution: `place_order`, `place_multileg_order`, `cancel_order`, `cancel_and_replace_order`
