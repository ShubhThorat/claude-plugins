import { spawn, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Config ────────────────────────────────────────────────────────────────────
//
// Optional shared deployment: API_SERVER_URL or API_SERVER_HOST + API_SERVER_KEY (or API_KEY).
// When set, omit SSH_CLUSTER_API_URL / SSH_CLUSTER_API_KEY if the same host issues your certs.
//
// SSH-specific: SSH_CLUSTER_USERNAME (required), optional SSH_CLUSTER_API_* overrides.

const CONFIG_DIR = join(homedir(), ".config", "ssh-cluster");
const KEY_PATH = join(CONFIG_DIR, "id_ed25519");
const CERT_PATH = join(CONFIG_DIR, "id_ed25519-cert.pub"); // OpenSSH auto-loads this
const CERT_TTL_MS = 55 * 60 * 1000; // 55 min — server issues 1h certs

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

/** Full API base URL (no trailing slash). Supports host-only via API_SERVER_HOST. */
function commonApiServerBaseUrl() {
  const raw = getEnv("API_SERVER_URL") || getEnv("API_SERVER_HOST");
  if (!raw) return "";
  let s = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/$/, "");
}

/** Shared API key when using API_SERVER_* with the same deployment. */
function commonApiServerKey() {
  return getEnv("API_SERVER_KEY") || getEnv("API_KEY");
}

function resolvedSshClusterApiUrl() {
  const specific = getEnv("SSH_CLUSTER_API_URL");
  if (specific) return specific.replace(/\/$/, "");
  return commonApiServerBaseUrl();
}

function resolvedSshClusterApiKey() {
  return getEnv("SSH_CLUSTER_API_KEY") || commonApiServerKey();
}

function getRequiredEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(
      `Missing required config: ${name}. Set it in the MCP env or in ~/.config/ssh-cluster/env.json`,
    );
  }
  return value;
}

function requireSshClusterApiUrl() {
  const u = resolvedSshClusterApiUrl();
  if (!u) {
    throw new Error(
      "Missing API base URL: set SSH_CLUSTER_API_URL or API_SERVER_URL (or API_SERVER_HOST) in MCP env or ~/.config/ssh-cluster/env.json",
    );
  }
  return u;
}

function requireSshClusterApiKey() {
  const k = resolvedSshClusterApiKey();
  if (!k) {
    throw new Error(
      "Missing API key: set SSH_CLUSTER_API_KEY or API_SERVER_KEY (or API_KEY) in MCP env or ~/.config/ssh-cluster/env.json",
    );
  }
  return k;
}

function parsePositiveInt(name, fallback) {
  const raw = getEnv(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

// ── Keypair + cert management ─────────────────────────────────────────────────

function ensureKeypair() {
  if (existsSync(KEY_PATH)) return;
  mkdirSync(CONFIG_DIR, { recursive: true });
  execSync(
    `ssh-keygen -t ed25519 -f "${KEY_PATH}" -N "" -C "ssh-cluster-mcp" -q`,
  );
}

let certCache = { cachedAt: 0, sshHost: "" }; // sshHost = "user@hostname" from API response

async function ensureCert() {
  // Fast path: in-memory cache is still warm
  if (Date.now() - certCache.cachedAt < CERT_TTL_MS) return certCache.sshHost;

  // After a process restart the file may still be fresh — but we still need host from API
  // so only skip the fetch if the file is fresh AND we already have the host cached
  if (certCache.sshHost && existsSync(CERT_PATH)) {
    const mtime = statSync(CERT_PATH).mtimeMs;
    if (Date.now() - mtime < CERT_TTL_MS) {
      certCache.cachedAt = mtime;
      return certCache.sshHost;
    }
  }

  const apiUrl = requireSshClusterApiUrl();
  const apiKey = requireSshClusterApiKey();
  const pubKey = readFileSync(`${KEY_PATH}.pub`, "utf8").trim();

  const username = getRequiredEnv("SSH_CLUSTER_USERNAME");
  const resp = await fetch(`${apiUrl}/ssh/cert:${username}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ public_key: pubKey }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`cert API returned ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  if (!data.certificate)
    throw new Error("cert API response missing 'certificate' field");
  if (!data.user || !data.host)
    throw new Error("cert API response missing 'user' or 'host' field");

  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CERT_PATH, data.certificate + "\n", { mode: 0o600 });
  certCache = { cachedAt: Date.now(), sshHost: `${data.user}@${data.host}` };
  return certCache.sshHost;
}

// ── SSH execution ─────────────────────────────────────────────────────────────

function buildSshArgs(sshHost) {
  const args = ["-i", KEY_PATH, "-o", "IdentitiesOnly=yes"];

  const port = getEnv("SSH_CLUSTER_PORT");
  if (port) args.push("-p", port);

  const strictRaw = (
    getEnv("SSH_CLUSTER_STRICT_HOST_KEY") || "true"
  ).toLowerCase();
  if (strictRaw === "false") {
    args.push(
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
    );
  }

  args.push(sshHost);
  return args;
}

async function runSsh({ remoteArgs, stdinText, timeoutMs }) {
  ensureKeypair();
  const sshHost = await ensureCert();

  const maxOutputBytes = parsePositiveInt(
    "SSH_CLUSTER_MAX_OUTPUT_BYTES",
    262144,
  );
  const defaultTimeoutMs = parsePositiveInt(
    "SSH_CLUSTER_DEFAULT_TIMEOUT_MS",
    120000,
  );
  const effectiveTimeout = timeoutMs > 0 ? timeoutMs : defaultTimeoutMs;

  return new Promise((resolve, reject) => {
    const args = [...buildSshArgs(sshHost), ...remoteArgs];
    const child = spawn("ssh", args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let outputTruncated = false;
    const startedAt = Date.now();

    const accumulate = (chunk, assign) => {
      if (outputTruncated) return;
      const text = chunk.toString("utf8");
      const nextBytes = outputBytes + Buffer.byteLength(text, "utf8");
      if (nextBytes > maxOutputBytes) {
        const remaining = Math.max(0, maxOutputBytes - outputBytes);
        const partial = Buffer.from(text, "utf8")
          .subarray(0, remaining)
          .toString("utf8");
        assign((prev) => prev + partial);
        outputBytes = maxOutputBytes;
        outputTruncated = true;
        child.kill("SIGTERM");
        return;
      }
      outputBytes = nextBytes;
      assign((prev) => prev + text);
    };

    child.stdout.on("data", (chunk) =>
      accumulate(chunk, (s) => {
        stdout = s(stdout);
      }),
    );
    child.stderr.on("data", (chunk) =>
      accumulate(chunk, (s) => {
        stderr = s(stderr);
      }),
    );
    child.on("error", reject);

    const timer = setTimeout(() => child.kill("SIGTERM"), effectiveTimeout);

    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      resolve({
        exitCode: exitCode ?? -1,
        signal,
        timedOut: durationMs >= effectiveTimeout && signal !== null,
        outputTruncated,
        durationMs,
        stdout,
        stderr,
      });
    });

    if (stdinText) child.stdin.write(stdinText);
    child.stdin.end();
  });
}

function asTextContent(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

// ── MCP tools ─────────────────────────────────────────────────────────────────

const server = new McpServer({ name: "ssh-cluster", version: "0.3.1" });

server.tool(
  "check_connection",
  "Check SSH connectivity and return remote host basics.",
  {},
  async () => {
    try {
      const result = await runSsh({
        remoteArgs: ['echo "$(hostname)|$(whoami)|$(pwd)"'],
        timeoutMs: 20000,
      });
      return asTextContent({
        ok: result.exitCode === 0 && !result.timedOut,
        ...result,
      });
    } catch (error) {
      return asTextContent({ ok: false, error: String(error) });
    }
  },
);

server.tool(
  "run_remote_command",
  "Run a shell command on the remote SSH cluster.",
  {
    command: z.string().min(1),
    timeoutMs: z.number().int().positive().optional(),
  },
  async ({ command, timeoutMs }) => {
    try {
      const escaped = command.replace(/'/g, "'\\''");
      const result = await runSsh({
        remoteArgs: [`bash -lc '${escaped}'`],
        timeoutMs,
      });
      return asTextContent({ command, ...result });
    } catch (error) {
      return asTextContent({ command, ok: false, error: String(error) });
    }
  },
);

server.tool(
  "run_remote_script",
  "Run a multiline script on the remote SSH cluster using bash stdin.",
  {
    script: z.string().min(1),
    timeoutMs: z.number().int().positive().optional(),
  },
  async ({ script, timeoutMs }) => {
    try {
      const result = await runSsh({
        remoteArgs: ["bash", "-s"],
        stdinText: `${script}\n`,
        timeoutMs,
      });
      return asTextContent({ ...result });
    } catch (error) {
      return asTextContent({ ok: false, error: String(error) });
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
