import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const portals = [
  { name: "Retailer Portal", port: 4001, color: "\x1b[36m" },
  { name: "Admin Portal", port: 4002, color: "\x1b[32m" },
  { name: "Super Admin Portal", port: 4003, color: "\x1b[35m" },
];

const children = [];

function startPortal({ name, port, color }) {
  console.log(`${color}[${name}] Starting on http://localhost:${port} ...\x1b[0m`);
  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "npx.cmd" : "npx";
  const child = spawn(cmd, ["next", "start", "-H", "0.0.0.0", "-p", String(port)], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    const lines = chunk.toString().trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}[${name}:${port}]\x1b[0m ${line}`);
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    const lines = chunk.toString().trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${color}[${name}:${port}:err]\x1b[0m ${line}`);
      }
    }
  });

  child.on("exit", (code) => {
    console.log(`${color}[${name}] exited with code ${code}\x1b[0m`);
  });

  children.push(child);
}

for (const portal of portals) {
  startPortal(portal);
}

const shutdown = () => {
  console.log("\nShutting down all portal servers...");
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

