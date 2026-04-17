---
name: options-spread-builder
description: Use this skill when the user asks for credit/debit spread ideas, strike selection help, expiration comparisons, or preflight-ready option spread parameters on Public.com.
version: 1.0.0
---

# Options Spread Builder

Use this skill to design practical spread setups that are ready for `preflight_multileg_order`.

## Supported strategy patterns

- CALL credit spread (bear call spread)
- PUT credit spread (bull put spread)
- CALL debit spread (bull call spread)
- PUT debit spread (bear put spread)

## Build workflow

1. Pull context with `get_quotes` and `get_option_expirations`.
2. Fetch candidate contracts via `get_option_chain`.
3. Propose 2-4 spread candidates with:
   - expiration date
   - short/long strikes
   - net credit/debit target
   - max risk and rough reward profile
4. Validate candidate logic with `preflight_multileg_order`.
5. Recommend one primary setup and one conservative fallback.

## Guardrails

- Always confirm direction and risk budget before finalizing setup.
- Ensure spread leg ordering is strategy-consistent.
- Prefer liquid, near-standard expirations unless user requests otherwise.
- Do not place orders from this skill; produce a confirmation-ready execution packet.

## Execution packet template

- Strategy type
- Underlying symbol
- Expiration date
- Leg definitions (side + option symbol)
- Quantity
- Limit price
- Time in force
- Preflight summary
