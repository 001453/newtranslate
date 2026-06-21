#!/usr/bin/env node
/**
 * First-time setup for packaged GlobalBridge Desktop.
 * Uses bundled Windows Python when present; otherwise system Python (dev/mac).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(" ")}  (${cwd})`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWin && !args[0]?.includes("\\") });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function bundledPython() {
  const exe = join(root, "python-runtime", "python.exe");
  return existsSync(exe) ? exe : null;
}

function resolvePython() {
  const bundled = bundledPython();
  if (bundled) {
    console.log("Using bundled Python (included with installer).");
    return bundled;
  }
  return isWin ? "python" : "python3";
}

function ensureEnv() {
  const example = join(root, ".env.example");
  const rootEnv = join(root, ".env");
  const backendEnv = join(root, "backend", ".env");
  if (!existsSync(rootEnv) && existsSync(example)) {
    copyFileSync(example, rootEnv);
    console.log(`Created ${rootEnv}`);
  }
  if (existsSync(rootEnv)) {
    copyFileSync(rootEnv, backendEnv);
    console.log(`Synced ${backendEnv}`);
  }

  const feExample = join(root, "frontend", ".env.example");
  const feLocal = join(root, "frontend", ".env.local");
  if (!existsSync(feLocal) && existsSync(feExample)) {
    copyFileSync(feExample, feLocal);
    console.log(`Created ${feLocal}`);
  }
}

function createBackendVenv(pythonExe, backendDir) {
  const venvPy = join(backendDir, ".venv", isWin ? "Scripts/python.exe" : "bin/python");
  if (existsSync(venvPy)) return venvPy;

  console.log("\nCreating Python venv…");
  let r = spawnSync(pythonExe, ["-m", "venv", ".venv"], {
    cwd: backendDir,
    stdio: "inherit",
    shell: false,
  });
  if (r.status === 0 && existsSync(venvPy)) return venvPy;

  console.log("venv unavailable — using virtualenv…");
  run(pythonExe, ["-m", "pip", "install", "virtualenv", "--no-warn-script-location"], backendDir);
  run(pythonExe, ["-m", "virtualenv", ".venv"], backendDir);
  return venvPy;
}

function ensureBackendVenv() {
  const backendDir = join(root, "backend");
  const pythonExe = resolvePython();
  const venvPy = createBackendVenv(pythonExe, backendDir);
  run(venvPy, ["-m", "pip", "install", "-r", "requirements.txt"], backendDir);
}

console.log("GlobalBridge AI — packaged setup\n================================");

ensureEnv();
mkdirSync(join(root, "backend", "data"), { recursive: true });
ensureBackendVenv();

console.log("\n✓ Setup complete. Start services from the tray app.\n");
