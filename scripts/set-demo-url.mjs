#!/usr/bin/env node
/**
 * Set the public demo video URL in docs/DEMO.md and README.md
 * Usage: npm run demo:url -- https://youtu.be/VIDEO_ID
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.argv[2]?.trim();

if (!url || !/^https?:\/\//i.test(url)) {
  console.error("Usage: npm run demo:url -- https://youtu.be/VIDEO_ID");
  process.exit(1);
}

const block = `▶ **[Watch demo on YouTube](${url})** — sovereign live captions (Whisper + QVAC + tab audio, ~5 min)`;

function replaceMarkers(content, replacement) {
  const start = "<!-- DEMO_VIDEO_START -->";
  const end = "<!-- DEMO_VIDEO_END -->";
  const i = content.indexOf(start);
  const j = content.indexOf(end);
  if (i === -1 || j === -1) throw new Error("DEMO_VIDEO markers not found");
  return content.slice(0, i + start.length) + "\n" + replacement + "\n" + content.slice(j);
}

for (const rel of ["docs/DEMO.md", "README.md"]) {
  const path = join(root, rel);
  const next = replaceMarkers(readFileSync(path, "utf8"), block);
  writeFileSync(path, next);
  console.log(`Updated ${rel}`);
}

console.log("\nDone. Commit and push the demo link.");
