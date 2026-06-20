#!/usr/bin/env node
/**
 * Strip Cursor co-author trailers from commit messages.
 * Configured via: git config core.hooksPath .githooks
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) process.exit(0);

const text = readFileSync(file, "utf8");
const filtered = text
  .split(/\r?\n/)
  .filter((line) => !/^Co-authored-by:\s*Cursor\s*</i.test(line.trim()))
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trimEnd();

if (filtered !== text) {
  writeFileSync(file, filtered.endsWith("\n") ? filtered : `${filtered}\n`, "utf8");
}
