#!/usr/bin/env node
/**
 * GlobalBridge AI — first-time setup
 * Copies .env, installs Node + Python dependencies.
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

console.log("GlobalBridge AI — setup\n=======================");

ensureEnv();
mkdirSync(join(root, "backend", "data"), { recursive: true });

run("npm", ["install"], join(root, "qvac-service"));
run("npm", ["install"], join(root, "frontend"));
ensureBackendVenv();

console.log("\n✓ Setup complete. Start all services:\n");
console.log("  npm run dev");
console.log("  — or —");
console.log("  .\\scripts\\start-dev.ps1   (Windows, ayrı pencereler)\n");
