import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://luma.shubhthorat.com";

async function get(path, query = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

const server = new McpServer({ name: "luma", version: "0.1.0" });

server.tool(
  "discover",
  "Fetch the Luma discover page: places, categories, calendars, and hydration coordinates.",
  { timeout: z.number().int().min(5).max(120).optional() },
  async ({ timeout }) => {
    const data = await get("/api/luma/discover", { timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "events_near",
  "Fetch events near a lat/lon, with optional category and time filters.",
  {
    lat: z.number().describe("Latitude"),
    lon: z.number().describe("Longitude"),
    category: z.string().optional().describe("Category slug (e.g. music, tech, ai)"),
    when: z.string().optional().describe("Time filter (e.g. today, this-week)"),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
    cursor: z.string().optional(),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ lat, lon, category, when, limit, cursor, timeout }) => {
    const data = await get("/api/luma/events/near", { lat, lon, category, when, limit, cursor, timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "event",
  "Fetch full detail for a Luma event by its api_id.",
  {
    id: z.string().describe("Event api_id (e.g. evt-abc123)"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ id, timeout }) => {
    const data = await get("/api/luma/event", { id, timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "event_guests",
  "Fetch featured guests for a Luma event.",
  {
    id: z.string().describe("Event api_id"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ id, timeout }) => {
    const data = await get("/api/luma/event/guests", { id, timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "events_by_place",
  "Fetch events at a specific Luma place. Use place_id from discover results.",
  {
    place_id: z.string().describe("discover_place_api_id from discover"),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    fetch_all: z.boolean().optional().describe("Follow all pages automatically"),
    max_pages: z.number().int().min(1).max(500).optional(),
    when: z.string().optional(),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ place_id, limit, cursor, fetch_all, max_pages, when, timeout }) => {
    const data = await get(`/api/luma/events/place/${place_id}`, {
      pagination_limit: limit, cursor, fetch_all, max_pages, when, timeout,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "events_by_category",
  "Fetch events in a category near a location. Slugs come from discover results.",
  {
    slug: z.string().describe("Category slug (e.g. music, tech, fitness)"),
    lat: z.number().describe("Latitude"),
    lon: z.number().describe("Longitude"),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    fetch_all: z.boolean().optional(),
    max_pages: z.number().int().min(1).max(500).optional(),
    when: z.string().optional(),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ slug, lat, lon, limit, cursor, fetch_all, max_pages, when, timeout }) => {
    const data = await get(`/api/luma/events/category/${slug}`, {
      latitude: lat, longitude: lon, pagination_limit: limit,
      cursor, fetch_all, max_pages, when, timeout,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "calendar_items",
  "Fetch upcoming events from a Luma calendar.",
  {
    id: z.string().describe("Calendar api_id"),
    period: z.enum(["future", "past", "all"]).optional().describe("Default: future"),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    fetch_all: z.boolean().optional(),
    max_pages: z.number().int().min(1).max(500).optional(),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ id, period, limit, cursor, fetch_all, max_pages, timeout }) => {
    const data = await get(`/api/luma/calendar/${id}/items`, {
      period, pagination_limit: limit, cursor, fetch_all, max_pages, timeout,
    });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "calendar",
  "Fetch full calendar detail including hosts, tags, and featured items.",
  {
    id: z.string().describe("Calendar api_id"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ id, timeout }) => {
    const data = await get(`/api/luma/calendar/${id}`, { timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "calendar_profile",
  "Fetch organizer profile for a Luma calendar (bio, socials, verified status).",
  {
    id: z.string().describe("Calendar api_id"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ id, timeout }) => {
    const data = await get(`/api/luma/calendar/${id}/profile`, { timeout });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
