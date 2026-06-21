#!/usr/bin/env node
/**
 * First-time setup for packaged GlobalBridge Desktop.
 * Skips npm install (bundled in installer) — only .env + Python venv.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(" ")}  (${cwd})`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWin });
  if (r.status !== 0) process.exit(r.status ?? 1);
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

function ensureBackendVenv() {
  const venvDir = join(root, "backend", ".venv");
  const py = isWin ? "python" : "python3";
  const venvPy = join(venvDir, isWin ? "Scripts/python.exe" : "bin/python");

  if (!existsSync(venvPy)) {
    console.log("\nCreating Python venv...");
    run(py, ["-m", "venv", ".venv"], join(root, "backend"));
  }

  run(venvPy, ["-m", "pip", "install", "-r", "requirements.txt"], join(root, "backend"));
}

console.log("GlobalBridge AI — packaged setup\n================================");

ensureEnv();
mkdirSync(join(root, "backend", "data"), { recursive: true });
ensureBackendVenv();

console.log("\n✓ Setup complete. Start services from the tray app.\n");
