import { spawn } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePositiveInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function strictHostKeyEnabled() {
  const raw = (process.env.SSH_CLUSTER_STRICT_HOST_KEY ?? "true").toLowerCase();
  return raw !== "false";
}

function buildSshArgs() {
  const host = getRequiredEnv("SSH_CLUSTER_HOST");
  const args = [];
  const port = process.env.SSH_CLUSTER_PORT?.trim();
  const keyPath = process.env.SSH_CLUSTER_KEY_PATH?.trim();

  if (port) {
    args.push("-p", port);
  }
  if (keyPath) {
    args.push("-i", keyPath);
  }
  if (!strictHostKeyEnabled()) {
    args.push(
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null"
    );
  }

  args.push(host);
  return args;
}

function runSsh({ remoteArgs, stdinText, timeoutMs }) {
  const maxOutputBytes = parsePositiveInt("SSH_CLUSTER_MAX_OUTPUT_BYTES", 262144);
  const defaultTimeoutMs = parsePositiveInt("SSH_CLUSTER_DEFAULT_TIMEOUT_MS", 120000);
  const effectiveTimeoutMs = timeoutMs > 0 ? timeoutMs : defaultTimeoutMs;

  return new Promise((resolve, reject) => {
    const args = [...buildSshArgs(), ...remoteArgs];
    const child = spawn("ssh", args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let outputTruncated = false;
    const startedAt = Date.now();

    const stopReadingIfNeeded = (chunk, assign) => {
      if (outputTruncated) return;
      const chunkText = chunk.toString("utf8");
      const nextBytes = outputBytes + Buffer.byteLength(chunkText, "utf8");
      if (nextBytes > maxOutputBytes) {
        const remainingBytes = Math.max(0, maxOutputBytes - outputBytes);
        const partial = Buffer.from(chunkText, "utf8")
          .subarray(0, remainingBytes)
          .toString("utf8");
        assign((prev) => prev + partial);
        outputBytes = maxOutputBytes;
        outputTruncated = true;
        child.kill("SIGTERM");
        return;
      }
      outputBytes = nextBytes;
      assign((prev) => prev + chunkText);
    };

    child.stdout.on("data", (chunk) => {
      stopReadingIfNeeded(chunk, (setter) => {
        stdout = setter(stdout);
      });
    });

    child.stderr.on("data", (chunk) => {
      stopReadingIfNeeded(chunk, (setter) => {
        stderr = setter(stderr);
      });
    });

    child.on("error", (error) => {
      reject(error);
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, effectiveTimeoutMs);

    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;
      const timedOut = durationMs >= effectiveTimeoutMs && signal !== null;

      resolve({
        exitCode: exitCode ?? -1,
        signal,
        timedOut,
        outputTruncated,
        durationMs,
        stdout,
        stderr
      });
    });

    if (stdinText) {
      child.stdin.write(stdinText);
    }
    child.stdin.end();
  });
}

function asTextContent(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

const server = new McpServer({
  name: "ssh-cluster",
  version: "0.1.0"
});

server.tool(
  "check_connection",
  "Check SSH connectivity and return remote host basics.",
  {},
  async () => {
    try {
      const result = await runSsh({
        remoteArgs: [
          "bash",
          "-lc",
          "printf '%s|%s|%s\\n' \"$(hostname)\" \"$(whoami)\" \"$(pwd)\""
        ],
        timeoutMs: 20000
      });

      return asTextContent({
        ok: result.exitCode === 0 && !result.timedOut,
        ...result
      });
    } catch (error) {
      return asTextContent({
        ok: false,
        error: String(error)
      });
    }
  }
);

server.tool(
  "run_remote_command",
  "Run a shell command on the remote SSH cluster.",
  {
    command: z.string().min(1),
    timeoutMs: z.number().int().positive().optional()
  },
  async ({ command, timeoutMs }) => {
    try {
      const result = await runSsh({
        remoteArgs: ["bash", "-lc", command],
        timeoutMs
      });
      return asTextContent({
        command,
        ...result
      });
    } catch (error) {
      return asTextContent({
        command,
        ok: false,
        error: String(error)
      });
    }
  }
);

server.tool(
  "run_remote_script",
  "Run a multiline script on the remote SSH cluster using bash stdin.",
  {
    script: z.string().min(1),
    timeoutMs: z.number().int().positive().optional()
  },
  async ({ script, timeoutMs }) => {
    try {
      const result = await runSsh({
        remoteArgs: ["bash", "-s"],
        stdinText: `${script}\n`,
        timeoutMs
      });
      return asTextContent({
        ...result
      });
    } catch (error) {
      return asTextContent({
        ok: false,
        error: String(error)
      });
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
