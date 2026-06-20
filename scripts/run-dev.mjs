#!/usr/bin/env node
/**
 * Start QVAC (8765) + Backend (8000) + Frontend (3000) together.
 */
import { execFileSync, spawn } from "node:child_process";
import http from "node:http";
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
    shell: isWin,
    probe: { host: "127.0.0.1", port: 8765, path: "/health" },
  },
  {
    name: "API",
    color: "\x1b[32m",
    cwd: root,
    cmd: process.execPath,
    args: [join(root, "scripts", "run-backend.mjs")],
    shell: false,
    probe: { host: "127.0.0.1", port: 8000, path: "/docs" },
  },
  {
    name: "WEB",
    color: "\x1b[35m",
    cwd: join(root, "frontend"),
    cmd: isWin ? "npm.cmd" : "npm",
    args: ["run", "dev"],
    shell: isWin,
    probe: { host: "127.0.0.1", port: 3000, path: "/" },
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
    shell: svc.shell ?? false,
    stdio: ["ignore", "pipe", "pipe"],
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

function probeService({ host, port, path }) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path, timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function clearStaleDevProcesses() {
  if (process.env.DEV_SKIP_STOP === "1") {
    console.log("Skipping dev:stop (DEV_SKIP_STOP=1).\n");
    return false;
  }
  try {
    execFileSync(process.execPath, [join(root, "scripts", "stop-dev.mjs")], { stdio: "inherit" });
    return true;
  } catch {
    console.warn(
      "\nCould not stop previous dev session (often another Admin terminal owns the process).",
    );
    console.warn("Checking whether services are already healthy...\n");
    return false;
  }
}

async function main() {
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

  const stopOk = await clearStaleDevProcesses();
  const skip = new Set();

  if (!stopOk) {
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      if (await probeService(svc.probe)) {
        console.log(`${svc.color}[${svc.name}]${reset} already running — reusing.\n`);
        skip.add(i);
      }
    }
    if (skip.size === 0) {
      console.error("Ports are blocked and services are not responding.");
      console.error("Open PowerShell as Administrator, then run:");
      console.error("  cd D:\\Projects\\newtranslate");
      console.error("  npm run dev:stop");
      console.error("Or kill the PID shown above with: taskkill /PID <pid> /F /T\n");
      process.exit(1);
    }
  }

  for (let i = 0; i < services.length; i++) {
    if (!skip.has(i)) startService(services[i]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
