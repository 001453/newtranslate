#!/usr/bin/env node
/**
 * Set the public demo video URL in docs/DEMO.md, README.md, and docs/site/demo.html
 * Usage: npm run demo:url -- https://youtu.be/ID
 *        npm run demo:url -- https://github.com/001453/newtranslate/releases/download/v0.1.0/globalbridge-demo.mp4
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.argv[2]?.trim();

if (!url || !/^https?:\/\//i.test(url)) {
  console.error("Usage: npm run demo:url -- https://youtu.be/VIDEO_ID");
  console.error("   or: npm run demo:url -- https://github.com/.../releases/download/.../demo.mp4");
  process.exit(1);
}

const isYoutube = /youtu\.be|youtube\.com/i.test(url);
const block = isYoutube
  ? `▶ **[Watch demo on YouTube](${url})** — sovereign live captions (Whisper + QVAC + tab audio, ~5 min)`
  : `▶ **[Watch demo video (MP4)](${url})** — sovereign live captions (Whisper + QVAC + tab audio)`;

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
  writeFileSync(path, replaceMarkers(readFileSync(path, "utf8"), block));
  console.log(`Updated ${rel}`);
}

const demoHtmlPath = join(root, "docs/site/demo.html");
const demoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GlobalBridge AI — Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0f14; color: #e8eef5; margin: 0; padding: 2rem; }
    a { color: #3b82f6; }
    video { max-width: 100%; border-radius: 8px; margin-top: 1rem; background: #000; }
    .wrap { max-width: 960px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>GlobalBridge AI — Demo</h1>
    <p>Sovereign live captions: local Whisper + QVAC. <a href="https://github.com/001453/newtranslate">Source on GitHub</a></p>
    <video controls preload="metadata" src="${url}"></video>
    <p style="margin-top:1rem;color:#8b9cb0;font-size:0.9rem;">
      <a href="${url}">Direct download</a> ·
      <a href="https://github.com/001453/newtranslate/blob/main/docs/DEMO.md">Demo page</a>
    </p>
  </div>
</body>
</html>
`;
writeFileSync(demoHtmlPath, demoHtml);
console.log("Updated docs/site/demo.html");

console.log("\nDone. Commit and push.");
