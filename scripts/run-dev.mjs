#!/usr/bin/env node
/**
 * Start QVAC (8765) + Backend (8000) + Frontend (3000) together.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const services = [
  {
    name: "QVAC",
    color: "\x1b[34m",
    cwd: join(root, "qvac-service"),
    cmd: isWin ? "npm.cmd" : "npm",
    args: ["start"],
  },
  {
    name: "API",
    color: "\x1b[32m",
    cwd: root,
    cmd: process.execPath,
    args: [join(root, "scripts", "run-backend.mjs")],
  },
  {
    name: "WEB",
    color: "\x1b[35m",
    cwd: join(root, "frontend"),
    cmd: isWin ? "npm.cmd" : "npm",
    args: ["run", "dev"],
  },
];

const reset = "\x1b[0m";
const children = [];

function prefix(name, color, data) {
  const lines = String(data).split(/\r?\n/);
  for (const line of lines) {
    if (line.trim()) process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
  }
}

function startService(svc) {
  const child = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd,
    env: { ...process.env, FORCE_COLOR: "1" },
    shell: false,
  });

  child.stdout?.on("data", (d) => prefix(svc.name, svc.color, d));
  child.stderr?.on("data", (d) => prefix(svc.name, svc.color, d));
  child.on("exit", (code) => {
    console.log(`${svc.color}[${svc.name}]${reset} exited (${code ?? 0})`);
    shutdown(code ?? 0);
  });

  children.push(child);
  return child;
}

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (!c.killed) {
      if (isWin) spawn("taskkill", ["/pid", String(c.pid), "/f", "/t"], { shell: true });
      else c.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// Quick preflight
const venv = join(root, "backend", ".venv", isWin ? "Scripts/python.exe" : "bin/python");
if (!existsSync(venv)) {
  console.error("Backend venv missing. Run: npm run setup");
  process.exit(1);
}

console.log("GlobalBridge AI — starting services");
console.log("  QVAC  → http://127.0.0.1:8765");
console.log("  API   → http://127.0.0.1:8000");
console.log("  WEB   → http://localhost:3000");
console.log("Press Ctrl+C to stop all.\n");

for (const svc of services) startService(svc);
