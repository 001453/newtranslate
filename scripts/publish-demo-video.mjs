#!/usr/bin/env node
/**
 * Upload demo MP4 to GitHub Release and update README + docs/DEMO.md
 *
 * Usage:
 *   npm run demo:publish -- "C:\Users\nihat\Downloads\20260620-1329-35.5783723.mp4"
 *   npm run demo:publish -- ./docs/assets/demo.mp4
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const defaultDownloads = join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads",
  "20260620-1329-35.5783723.mp4",
);

const src = process.argv[2]?.trim() || defaultDownloads;
const tag = (process.argv[3] || "v0.1.0").trim();
const assetName = "globalbridge-demo.mp4";
const repo = "001453/newtranslate";

if (!existsSync(src)) {
  console.error(`Demo video not found:\n  ${src}\n`);
  console.error("Usage:");
  console.error('  npm run demo:publish -- "C:\\Users\\YOU\\Downloads\\your-video.mp4"');
  process.exit(1);
}

const sizeMb = statSync(src).size / (1024 * 1024);
console.log(`Source: ${src}`);
console.log(`Size:   ${sizeMb.toFixed(1)} MB`);

const stagingDir = join(root, ".release-assets");
mkdirSync(stagingDir, { recursive: true });
const staged = join(stagingDir, assetName);
copyFileSync(src, staged);
console.log(`Staged: ${staged}`);

console.log(`\nUploading to GitHub Release ${tag}...`);
const gh = spawnSync("gh", ["release", "upload", tag, `${staged}#${assetName}`, "--clobber"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
});

const downloadUrl = `https://github.com/${repo}/releases/download/${tag}/${assetName}`;

if (gh.status !== 0) {
  console.error("\ngh upload failed (login: gh auth login). Manual steps:");
  console.error(`  1. Open https://github.com/${repo}/releases/tag/${tag}`);
  console.error(`  2. Edit release → Upload file: ${staged}`);
  console.error(`  3. npm run demo:url -- ${downloadUrl}`);
  process.exit(1);
}

console.log("\nUpdating demo links...");
const setUrl = spawnSync(process.execPath, [join(root, "scripts/set-demo-url.mjs"), downloadUrl], {
  stdio: "inherit",
});
if (setUrl.status !== 0) process.exit(setUrl.status ?? 1);

console.log(`\n✓ Demo URL: ${downloadUrl}`);
console.log("  Commit and push: README.md docs/DEMO.md docs/site/demo.html");
