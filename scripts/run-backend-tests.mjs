#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const backend = join(root, "backend");
const venvPy = join(backend, ".venv", isWin ? "Scripts/python.exe" : "bin/python");

if (!existsSync(venvPy)) {
  console.error("Backend venv missing. Run: npm run setup");
  process.exit(1);
}

const r = spawnSync(venvPy, ["-m", "pytest", "tests", "-q"], {
  cwd: backend,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
