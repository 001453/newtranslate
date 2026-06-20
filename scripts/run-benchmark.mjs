#!/usr/bin/env node
/**
 * Run backend latency benchmark (STT + QVAC translation).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const venvPython = join(root, "backend", ".venv", isWin ? "Scripts/python.exe" : "bin/python");
const script = join(root, "backend", "scripts", "benchmark_latency.py");

if (!existsSync(venvPython)) {
  console.error("Backend venv missing. Run: npm run setup");
  process.exit(1);
}

const extra = process.argv.slice(2);

execFileSync(venvPython, [script, ...extra], {
  cwd: join(root, "backend"),
  stdio: "inherit",
  env: { ...process.env, PYTHONPATH: join(root, "backend") },
});
