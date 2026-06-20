#!/usr/bin/env node
/**
 * Stop dev services bound to QVAC/API/WEB ports (8765, 8000, 3000).
 */
import { execSync } from "node:child_process";

const isWin = process.platform === "win32";
const PORTS = [8765, 8000, 3000];

function pidsOnPort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, {
        encoding: "utf8",
        shell: true,
        stdio: ["pipe", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const m = line.trim().match(/\s(\d+)\s*$/);
        if (m) pids.add(Number(m[1]));
      }
      return [...pids];
    }
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return out
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (!pid || pid === 4) return false;
  try {
    if (isWin) {
      execSync(`taskkill /pid ${pid} /f /t`, { shell: true, stdio: "ignore", timeout: 8000 });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore", timeout: 8000 });
    }
    return true;
  } catch {
    if (isWin) {
      try {
        execSync(
          `powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction Stop"`,
          { shell: true, stdio: "ignore", timeout: 8000 },
        );
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

const found = new Map();
for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    if (!found.has(pid)) found.set(pid, port);
  }
}

if (found.size === 0) {
  console.log("No dev services found on ports 8765, 8000, 3000.");
  process.exit(0);
}

const killed = [];
const failed = [];
for (const [pid, port] of found) {
  if (killPid(pid)) {
    killed.push({ pid, port });
    console.log(`Stopped PID ${pid} (port ${port})`);
  } else {
    failed.push({ pid, port });
  }
}

if (failed.length > 0) {
  console.error("\nCould not stop:");
  for (const { pid, port } of failed) console.error(`  • PID ${pid} (port ${port})`);
  console.error("\nClose them in Task Manager or run this terminal as Administrator.");
  process.exit(1);
}

console.log(`Stopped ${killed.length} process(es).`);
