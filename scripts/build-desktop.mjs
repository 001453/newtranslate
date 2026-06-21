#!/usr/bin/env node
/**
 * Build GlobalBridge Desktop installer (Windows NSIS + portable).
 * 1. Install deps (root, qvac, frontend, desktop)
 * 2. Production build frontend
 * 3. electron-builder
 */
import { spawnSync } from "node:child_process";
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

if (isWin) {
  run("node", ["scripts/fetch-embedded-python.mjs"], root);
} else {
  console.log("\nNote: embedded Python is Windows-only; macOS/Linux builds need system Python.\n");
}

const builderCmd = dirOnly ? "pack" : "dist";
run("npm", ["run", builderCmd, "--prefix", "desktop"]);

console.log("\n✓ Desktop build output: desktop/dist/\n");
