#!/usr/bin/env node
/**
 * Point this repo at .githooks (strips Cursor co-author trailers on commit).
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hooksDir = join(root, ".githooks");
const commitMsg = join(hooksDir, "commit-msg");

if (process.platform !== "win32" && existsSync(commitMsg)) {
  try {
    chmodSync(commitMsg, 0o755);
    chmodSync(join(hooksDir, "commit-msg.js"), 0o755);
  } catch {
    /* ignore */
  }
}

const r = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
});

if (r.status !== 0) process.exit(r.status ?? 1);
console.log("Git hooksPath → .githooks (Cursor co-author stripped on commit)");
