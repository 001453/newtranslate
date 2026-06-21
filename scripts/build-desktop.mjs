#!/usr/bin/env node
/**
 * Build GlobalBridge Desktop installer (Windows NSIS + portable).
 * 1. Install deps (root, qvac, frontend, desktop)
 * 2. Production build frontend
 * 3. electron-builder
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const dirOnly = process.argv.includes("--dir");

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(" ")}  (${cwd})\n`);
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: isWin,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("GlobalBridge Desktop — build\n==========================\n");

run("npm", ["install"], join(root, "qvac-service"));
run("npm", ["install"], join(root, "frontend"));
run("npm", ["run", "build"], join(root, "frontend"));
run("npm", ["install"], join(root, "desktop"));

const venvPy = join(root, "backend", ".venv", isWin ? "Scripts/python.exe" : "bin/python");
if (!existsSync(venvPy)) {
  console.log("\nNote: backend/.venv not found — installer users run First-time setup (Python required).\n");
}

const builderCmd = dirOnly ? "pack" : "dist";
run("npm", ["run", builderCmd, "--prefix", "desktop"]);

console.log("\n✓ Desktop build output: desktop/dist/\n");
