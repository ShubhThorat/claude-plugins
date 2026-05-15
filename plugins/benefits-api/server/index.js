import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_BASE = "https://api.shubhthorat.com";
const CONFIG_DIR = join(homedir(), ".config", "benefits-api");

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

function baseUrl() {
  const raw =
    getEnv("BENEFITS_API_URL") ||
    getEnv("API_SERVER_URL") ||
    getEnv("API_SERVER_HOST");
  if (!raw) return DEFAULT_BASE;
  let s = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/$/, "");
}

function apiKey() {
  return (
    getEnv("BENEFITS_API_KEY") || getEnv("API_SERVER_KEY") || getEnv("API_KEY")
  );
}

// ── OpenAPI → Zod ─────────────────────────────────────────────────────────────

function paramToZod(param) {
  const type = param.schema?.type;
  let base;
  if (type === "integer" || type === "number") {
    base = z.number();
  } else if (type === "boolean") {
    base = z.boolean();
  } else {
    base = z.string();
  }
  if (param.description) base = base.describe(param.description);
  return param.required ? base : base.optional();
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function apiGet(resolvedPath, query) {
  const url = new URL(`${baseUrl()}${resolvedPath}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  const headers = { Accept: "application/json" };
  const key = apiKey();
  if (key) headers["X-API-Key"] = key;
  const resp = await fetch(url, { headers });
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

// ── Dynamic tool registration ─────────────────────────────────────────────────

async function buildServer() {
  const server = new McpServer({ name: "api-server", version: "1.0.0" });

  let spec;
  try {
    const resp = await fetch(`${baseUrl()}/openapi.json`);
    spec = await resp.json();
  } catch (err) {
    // Fallback: start with no tools rather than crashing
    process.stderr.write(`[api-server] Failed to fetch OpenAPI spec: ${err}\n`);
    return server;
  }

  let registered = 0;
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    const op = pathItem.get;
    if (!op?.operationId) continue;

    const params = op.parameters || [];
    const pathParamNames = params
      .filter((p) => p.in === "path")
      .map((p) => p.name);

    const schema = {};
    for (const param of params) {
      if (param.in === "path" || param.in === "query") {
        schema[param.name] = paramToZod(param);
      }
    }

    const capturedPath = path;
    const capturedPathParamNames = pathParamNames;
    const toolName = op.operationId;
    const description =
      [op.summary, op.description].filter(Boolean).join(" — ") ||
      `GET ${path}`;

    server.tool(toolName, description, schema, async (args) => {
      try {
        let resolvedPath = capturedPath;
        const query = { ...args };

        for (const name of capturedPathParamNames) {
          resolvedPath = resolvedPath.replace(
            `{${name}}`,
            encodeURIComponent(args[name] ?? ""),
          );
          delete query[name];
        }

        const data = await apiGet(resolvedPath, query);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return {
          content: [
            { type: "text", text: JSON.stringify({ ok: false, error: String(err) }) },
          ],
        };
      }
    });

    registered++;
  }

  process.stderr.write(
    `[api-server] Registered ${registered} tools from ${baseUrl()}/openapi.json\n`,
  );
  return server;
}

const server = await buildServer();
const transport = new StdioServerTransport();
await server.connect(transport);
