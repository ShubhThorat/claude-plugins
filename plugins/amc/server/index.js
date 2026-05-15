import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://amc.shubhthorat.com";

async function get(path, query = {}, cookie) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  const headers = { Accept: "application/json" };
  if (cookie) headers["X-Amc-Cookie"] = cookie;
  const resp = await fetch(url, { headers });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

const server = new McpServer({ name: "amc", version: "0.1.0" });

server.tool(
  "theatres",
  "Search for AMC theatres near a city or location.",
  {
    q: z.string().describe("City or location query (e.g. 'miami', 'new york')"),
    cookie: z.string().optional().describe("AMC session cookie (X-Amc-Cookie). Falls back to server AMC_COOKIE env var."),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ q, cookie, timeout }) => {
    const data = await get("/api/amc/theatres", { q, timeout }, cookie);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "movies",
  "Get movies currently playing at an AMC theatre by its slug.",
  {
    slug: z.string().describe("Theatre slug (e.g. amc-causeway-13). Get slugs from the theatres tool."),
    cookie: z.string().optional().describe("AMC session cookie"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ slug, cookie, timeout }) => {
    const data = await get("/api/amc/movies", { slug, timeout }, cookie);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "showtimes",
  "Get showtimes at an AMC theatre for a given date. Requires AMC cookie (set AMC_COOKIE on server or pass cookie param).",
  {
    slug: z.string().describe("Theatre slug (e.g. amc-kips-bay-15)"),
    date: z.string().optional().describe("Date in YYYY-MM-DD format (default: today)"),
    movie: z.string().optional().describe("Filter by movie title (partial match)"),
    premium_offering: z.string().optional().describe("Format filter (e.g. imax, dolby, prime)"),
    cookie: z.string().optional().describe("AMC session cookie with cf_clearance (required)"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ slug, date, movie, premium_offering, cookie, timeout }) => {
    const data = await get("/api/amc/showtimes", { slug, date, movie, premium_offering, timeout }, cookie);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "seats",
  "Get live seat availability for an AMC showtime by its ID.",
  {
    showtime_id: z.number().int().describe("Showtime ID (from showtimes response)"),
    cookie: z.string().optional().describe("AMC session cookie"),
    timeout: z.number().int().min(5).max(120).optional(),
  },
  async ({ showtime_id, cookie, timeout }) => {
    const data = await get(`/api/amc/seats/${showtime_id}`, { timeout }, cookie);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
