import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/** Used when no `AMC_API_URL` / `API_SERVER_URL` / `API_SERVER_HOST` is set. */
const DEFAULT_AMC_PROXY_BASE = "https://api.shubhthorat.com";

const CONFIG_DIR = join(homedir(), ".config", "amc-api");

function loadPersistentConfig() {
  try {
    return JSON.parse(readFileSync(join(CONFIG_DIR, "env.json"), "utf8"));
  } catch {
    return {};
  }
}

const persistentConfig = loadPersistentConfig();

function getEnv(name) {
  return (process.env[name] || persistentConfig[name] || "").trim();
}

function commonApiServerBaseUrl() {
  const raw = getEnv("API_SERVER_URL") || getEnv("API_SERVER_HOST");
  if (!raw) return "";
  let s = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/$/, "");
}

function commonApiServerKey() {
  return getEnv("API_SERVER_KEY") || getEnv("API_KEY");
}

function resolvedAmcApiUrl() {
  const specific = getEnv("AMC_API_URL");
  if (specific) return specific.replace(/\/$/, "");
  return commonApiServerBaseUrl();
}

/** Browser session cookie for Queue-it / seats fetch (`X-Amc-Cookie`). */
function resolvedAmcCookie() {
  return getEnv("AMC_COOKIE") || getEnv("AMC_API_COOKIE");
}

function amcBaseUrl() {
  const u = resolvedAmcApiUrl();
  if (u) return u;
  return DEFAULT_AMC_PROXY_BASE.replace(/\/$/, "");
}

async function amcGet(pathname, query) {
  const base = amcBaseUrl();
  const root = base.endsWith("/") ? base : `${base}/`;
  const u = new URL(pathname.replace(/^\//, ""), root);
  for (const [qk, qv] of Object.entries(query || {})) {
    if (qv === undefined || qv === null || qv === "") continue;
    if (typeof qv === "boolean") {
      if (qv) u.searchParams.set(qk, "true");
      continue;
    }
    u.searchParams.set(qk, String(qv));
  }
  const headers = { Accept: "application/json" };
  const apiKey = commonApiServerKey();
  if (apiKey) headers["X-API-Key"] = apiKey;
  const cookie = resolvedAmcCookie();
  if (cookie) headers["X-Amc-Cookie"] = cookie;
  const resp = await fetch(u, { method: "GET", headers });
  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  if (!resp.ok) {
    const err = new Error(`AMC API ${resp.status}: ${text.slice(0, 500)}`);
    err.status = resp.status;
    err.body = data;
    throw err;
  }
  return data;
}

function asTextContent(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

const server = new McpServer({ name: "amc-api", version: "0.1.0" });

server.tool(
  "amc_theatres",
  "Theatre search / listing from GET /api/amc/theatres (JSON under `data`). Optional `X-Amc-Cookie` via AMC_COOKIE when Queue-it blocks.",
  {
    q: z.string().optional(),
    page_url: z.string().url().optional(),
    verbose: z.boolean().optional(),
    timeout: z.number().positive().max(120).optional(),
  },
  async ({ q, page_url, verbose, timeout }) => {
    try {
      const query = {};
      if (q !== undefined) query.q = q;
      if (page_url) query.page_url = page_url;
      if (verbose) query.verbose = true;
      if (timeout !== undefined) query.timeout = timeout;
      const data = await amcGet("/api/amc/theatres", query);
      return asTextContent(data);
    } catch (error) {
      return asTextContent({ ok: false, error: String(error) });
    }
  },
);

server.tool(
  "amc_showtimes",
  "Venue or movie showtimes from GET /api/amc/showtimes. Pass `url`, or `region`+`slug`, or `movie`; optional `date` (YYYY-MM-DD), `premium_offering`, `timeout`. Cookie via AMC_COOKIE when needed.",
  {
    url: z.string().url().optional(),
    region: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    movie: z.string().min(1).optional(),
    date: z.string().optional(),
    premium_offering: z.string().optional(),
    timeout: z.number().positive().max(120).optional(),
  },
  async (args) => {
    try {
      const { timeout, ...rest } = args;
      const query = { ...rest };
      if (timeout !== undefined) query.timeout = timeout;
      const data = await amcGet("/api/amc/showtimes", query);
      return asTextContent(data);
    } catch (error) {
      return asTextContent({ ok: false, error: String(error) });
    }
  },
);

server.tool(
  "amc_seats",
  "Seat map for a numeric AMC showtime id: GET /api/amc/seats/{id}. Requires AMC_COOKIE (or server AMC_COOKIE) for live fetch.",
  {
    showtime_id: z.number().int().positive(),
    timeout: z.number().positive().max(120).optional(),
  },
  async ({ showtime_id, timeout }) => {
    try {
      const q = {};
      if (timeout !== undefined) q.timeout = timeout;
      const data = await amcGet(
        `/api/amc/seats/${encodeURIComponent(String(showtime_id))}`,
        q,
      );
      return asTextContent(data);
    } catch (error) {
      return asTextContent({ ok: false, error: String(error) });
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
