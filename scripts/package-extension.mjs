#!/usr/bin/env node
/**
 * Zip extension/ for Chrome Web Store upload or manual distribution.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extDir = join(root, "extension");
const outDir = join(root, "dist");
const outFile = join(outDir, "GlobalBridge-Extension-v0.1.0.zip");
const isWin = process.platform === "win32";

if (!existsSync(extDir)) {
  console.error("extension/ folder not found");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
if (existsSync(outFile)) unlinkSync(outFile);

if (isWin) {
  const ps = `$ErrorActionPreference='Stop'; Compress-Archive -Path '${extDir.replace(/'/g, "''")}\\*' -DestinationPath '${outFile.replace(/'/g, "''")}' -Force`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
} else {
  const r = spawnSync("zip", ["-r", outFile, "."], { cwd: extDir, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log(`\n✓ ${outFile}\n`);
