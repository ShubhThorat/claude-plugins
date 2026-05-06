---
name: event-research
description: Research everyone at a Luma event — fetch guests then read their tweets via socials if available.
version: 1.0.0
---

# Luma Event Research

Given a Luma event api_id (evt-…), research the attendees by chaining Luma guest data with social media.

## Workflow

1. **Get guests** — call `luma_event_guests` with the event_api_id. Extract the `featured_guests` list and note each person's `twitter` handle.

2. **Check socials availability** — call `socials_health_check`. If it fails or isn't available, skip to step 4 and return guest profiles only.

3. **Read tweets** — for each guest that has a `twitter` handle:
   - Call `socials_navigate` with `https://x.com/explore` first (only once).
   - Call `socials_x_search` with `query: "from:<handle>"` and `mode: "latest"` to get their recent posts.
   - Collect up to 3 recent tweets per person.

4. **Output** — return a structured summary per person:
   - Name, username, bio
   - Socials (twitter, instagram, linkedin, etc.)
   - Recent tweets (if retrieved)
   - What they seem to be working on / interested in (1-line inference from tweets/bio)

## Input

- `event_api_id` — required. The Luma event ID (evt-…). Ask the user if not provided.

## Behavior

- If socials plugin is not connected, still return the guest profiles — just note that tweet enrichment is unavailable.
- Gracefully skip guests with no twitter handle for the tweet step.
- Keep the output concise — one block per person, not a wall of raw JSON.
