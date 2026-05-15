import { execFile, exec } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const HK_DB      = join(homedir(), "Library", "HomeKit", "core.sqlite");
const HK_DATA_DB = join(homedir(), "Library", "HomeKit", "datastore3.sqlite");

// ── SQLite helpers (via python3 stdlib) ───────────────────────────────────────

async function sqliteQuery(db, sql, params = []) {
  const script = `
import sqlite3, json, sys
try:
    conn = sqlite3.connect(${JSON.stringify(db)}, timeout=5)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(${JSON.stringify(sql)}, ${JSON.stringify(params)})
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    print(json.dumps(rows))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
  const { stdout } = await execFileAsync("python3", ["-c", script], { timeout: 10000 });
  return JSON.parse(stdout.trim());
}

// ── Device helpers ────────────────────────────────────────────────────────────

async function getDevices() {
  const rows = await sqliteQuery(HK_DB, `
    SELECT
      a.ZCONFIGUREDNAME  AS name,
      a.ZMODEL           AS model,
      a.ZMANUFACTURER    AS manufacturer,
      a.ZACCESSORYCATEGORY AS category,
      r.ZNAME            AS room
    FROM ZMKFACCESSORY a
    LEFT JOIN ZMKFROOM r ON a.ZROOM = r.Z_PK
    WHERE a.ZCONFIGUREDNAME IS NOT NULL
    ORDER BY r.ZNAME, a.ZCONFIGUREDNAME
  `);
  if (rows.error) throw new Error(rows.error);
  return rows;
}

async function getRooms() {
  const rows = await sqliteQuery(HK_DB, `
    SELECT ZNAME AS name FROM ZMKFROOM WHERE ZNAME IS NOT NULL ORDER BY ZNAME
  `);
  if (rows.error) throw new Error(rows.error);
  return rows.map(r => r.name);
}

async function getScenes() {
  const rows = await sqliteQuery(HK_DB, `
    SELECT s.ZNAME AS name FROM ZMKFCKSCENE s
    WHERE s.ZNAME IS NOT NULL ORDER BY s.ZNAME
  `);
  if (rows.error) throw new Error(rows.error);
  return rows.map(r => r.name);
}

// ── Shortcuts control ─────────────────────────────────────────────────────────

function shortcutName(device, action) {
  return `Home: ${device} ${action}`;
}

async function runShortcut(name) {
  try {
    await execFileAsync("shortcuts", ["run", name], { timeout: 15000 });
    return { ok: true };
  } catch (e) {
    const msg = e.stderr || e.message || String(e);
    if (msg.includes("not find") || msg.includes("not exist") || msg.includes("no shortcut")) {
      return { ok: false, missing: true, shortcut: name };
    }
    return { ok: false, error: msg };
  }
}

async function listShortcuts() {
  try {
    const { stdout } = await execFileAsync("shortcuts", ["list"], { timeout: 10000 });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new McpServer({ name: "apple-home", version: "0.1.0" });

server.tool(
  "home_devices",
  "List all HomeKit devices with their room and type. No arguments needed.",
  {},
  async () => {
    const devices = await getDevices();
    const rooms = await getRooms();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ devices, rooms }, null, 2),
      }],
    };
  },
);

server.tool(
  "home_control",
  `Control a HomeKit device. Runs the macOS Shortcut named "Home: <device> <action>" (e.g. "Home: Floor Lamp on").
The shortcut must exist in the Shortcuts app — use home_setup_guide if it hasn't been set up yet.
action: "on" | "off" | "toggle" | any custom action the shortcut accepts.`,
  {
    device: z.string().describe("Exact device name, e.g. 'Floor Lamp'"),
    action: z.string().describe('"on", "off", or any custom action'),
  },
  async ({ device, action }) => {
    const name = shortcutName(device, action);
    const result = await runShortcut(name);
    if (result.ok) {
      return { content: [{ type: "text", text: `✓ Ran shortcut "${name}"` }] };
    }
    if (result.missing) {
      const guide = setupGuideFor(device);
      return {
        content: [{
          type: "text",
          text: `Shortcut "${name}" not found.\n\n${guide}`,
        }],
      };
    }
    return { content: [{ type: "text", text: `Error: ${result.error}` }] };
  },
);

server.tool(
  "home_scenes",
  "List all HomeKit scenes.",
  {},
  async () => {
    const scenes = await getScenes();
    return { content: [{ type: "text", text: JSON.stringify(scenes, null, 2) }] };
  },
);

server.tool(
  "home_run_scene",
  `Run a HomeKit scene by name. Runs the Shortcut "Home Scene: <scene>".
The shortcut must exist — use home_setup_guide for setup instructions.`,
  { scene: z.string().describe("Scene name, e.g. 'Good Morning'") },
  async ({ scene }) => {
    const name = `Home Scene: ${scene}`;
    const result = await runShortcut(name);
    if (result.ok) {
      return { content: [{ type: "text", text: `✓ Ran scene "${scene}"` }] };
    }
    if (result.missing) {
      return {
        content: [{
          type: "text",
          text: `Shortcut "${name}" not found. Create a Shortcut in the Shortcuts app named exactly "${name}" with a HomeKit "Set scene" action for "${scene}".`,
        }],
      };
    }
    return { content: [{ type: "text", text: `Error: ${result.error}` }] };
  },
);

server.tool(
  "home_setup_guide",
  "Show setup instructions for creating the required Shortcuts to control your HomeKit devices.",
  {},
  async () => {
    const devices = await getDevices();
    const existing = await listShortcuts();
    const existingSet = new Set(existing);

    const lines = [
      "# Apple Home MCP — Shortcut Setup",
      "",
      "Create these Shortcuts in the Shortcuts app (cmd+space → Shortcuts).",
      "Each shortcut needs one action: **HomeKit → Control [Device] → set to On/Off**.",
      "",
      "## Required Shortcuts",
      "",
    ];

    for (const d of devices) {
      for (const action of ["on", "off"]) {
        const name = shortcutName(d.name, action);
        const status = existingSet.has(name) ? "✓ exists" : "✗ missing";
        lines.push(`- \`${name}\` — ${status}`);
        lines.push(`  Action: Set "${d.name}" to ${action === "on" ? "On" : "Off"}`);
      }
    }

    lines.push("", "## How to create a Shortcut", "");
    lines.push("1. Open Shortcuts app");
    lines.push("2. Click **+** to create new");
    lines.push("3. Name it exactly as shown above");
    lines.push("4. Add action: search **Home** → **Control [Device]** → set power On or Off");
    lines.push("5. Save");
    lines.push("");
    lines.push("Once created, `home_control` will work automatically.");

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

function setupGuideFor(device) {
  return [
    `To set up control for "${device}":`,
    `1. Open Shortcuts app (cmd+space → Shortcuts)`,
    `2. Create shortcut named: "Home: ${device} on"`,
    `   Add action: HomeKit → Control ${device} → Power: On`,
    `3. Create shortcut named: "Home: ${device} off"`,
    `   Add action: HomeKit → Control ${device} → Power: Off`,
    `4. Then retry this command.`,
  ].join("\n");
}

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
