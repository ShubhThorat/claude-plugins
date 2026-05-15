import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://luma.shubhthorat.com";

async function lumaGet(path, query = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "luma-api",
  version: "0.1.0",
});

server.tool(
  "luma_discover",
  "Fetch the Luma discover page: places, categories, calendars, and hydration coordinates.",
  {
    url: z.string().optional().describe("Override discover URL (default: https://luma.com/discover)"),
    timeout: z.number().int().min(5).max(120).optional().describe("Request timeout in seconds"),
  },
  async ({ url, timeout }) => {
    const data = await lumaGet("/api/luma/discover", { url, timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_events_near",
  "Fetch events near a lat/lon coordinate, with optional category and time filters.",
  {
    lat: z.number().describe("Latitude"),
    lon: z.number().describe("Longitude"),
    category: z.string().optional().describe("Category slug filter (e.g. 'music', 'tech')"),
    when: z.string().optional().describe("Time filter (e.g. 'today', 'this-week')"),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
    cursor: z.string().optional().describe("Pagination cursor"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ lat, lon, category, when, limit, cursor, timeout }) => {
    const data = await lumaGet("/api/luma/events/near", { lat, lon, category, when, limit, cursor, timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_event",
  "Fetch full detail for a single Luma event by its api_id.",
  {
    id: z.string().describe("Event api_id (e.g. evt-abc123)"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ id, timeout }) => {
    const data = await lumaGet("/api/luma/event", { id, timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_event_guests",
  "Fetch featured guests for a Luma event.",
  {
    id: z.string().describe("Event api_id"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ id, timeout }) => {
    const data = await lumaGet("/api/luma/event/guests", { id, timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_events_by_place",
  "Fetch events at a specific Luma place (discover_place_api_id).",
  {
    place_id: z.string().describe("Discover place api_id from luma_discover results"),
    pagination_limit: z.number().int().min(1).max(100).optional().describe("Results per page (default 10)"),
    cursor: z.string().optional().describe("Pagination cursor"),
    fetch_all: z.boolean().optional().describe("Follow all pages automatically"),
    max_pages: z.number().int().min(1).max(500).optional().describe("Max pages when fetch_all=true"),
    when: z.string().optional().describe("Time filter"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ place_id, pagination_limit, cursor, fetch_all, max_pages, when, timeout }) => {
    const data = await lumaGet(`/api/luma/events/place/${place_id}`, {
      pagination_limit, cursor, fetch_all, max_pages, when, timeout,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_events_by_category",
  "Fetch events in a category near a lat/lon. Category slug comes from luma_discover results.",
  {
    slug: z.string().describe("Category slug (e.g. 'music', 'tech', 'fitness')"),
    latitude: z.number().describe("Latitude"),
    longitude: z.number().describe("Longitude"),
    pagination_limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    fetch_all: z.boolean().optional().describe("Follow all pages automatically"),
    max_pages: z.number().int().min(1).max(500).optional(),
    when: z.string().optional(),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ slug, latitude, longitude, pagination_limit, cursor, fetch_all, max_pages, when, timeout }) => {
    const data = await lumaGet(`/api/luma/events/category/${slug}`, {
      latitude, longitude, pagination_limit, cursor, fetch_all, max_pages, when, timeout,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_calendar_items",
  "Fetch upcoming events from a Luma calendar.",
  {
    calendar_api_id: z.string().describe("Calendar api_id"),
    period: z.enum(["future", "past", "all"]).optional().describe("Time period (default: future)"),
    pagination_limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    fetch_all: z.boolean().optional(),
    max_pages: z.number().int().min(1).max(500).optional(),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ calendar_api_id, period, pagination_limit, cursor, fetch_all, max_pages, timeout }) => {
    const data = await lumaGet(`/api/luma/calendar/${calendar_api_id}/items`, {
      period, pagination_limit, cursor, fetch_all, max_pages, timeout,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_calendar_full",
  "Fetch full calendar detail including hosts, tags, and featured items.",
  {
    calendar_api_id: z.string().describe("Calendar api_id"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ calendar_api_id, timeout }) => {
    const data = await lumaGet(`/api/luma/calendar/${calendar_api_id}`, { timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "luma_calendar_profile",
  "Fetch organizer profile for a Luma calendar (bio, socials, verified status).",
  {
    calendar_api_id: z.string().describe("Calendar api_id"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ calendar_api_id, timeout }) => {
    const data = await lumaGet(`/api/luma/calendar/${calendar_api_id}/profile`, { timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── Run ───────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
