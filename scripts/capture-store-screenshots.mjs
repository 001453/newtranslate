/**
 * Capture Chrome Web Store screenshots (1280x800) from running dev server.
 * Usage: npx playwright screenshot ... OR node scripts/capture-store-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "extension", "store", "screenshots");
mkdirSync(outDir, { recursive: true });

const shots = [
  { url: "http://localhost:3000/live", name: "store-screenshot-01-live-overview-1280x800.png" },
  { url: "http://localhost:3000/live", name: "store-screenshot-02-live-controls-1280x800.png", scrollY: 420 },
  { url: "http://localhost:3000/live", name: "store-screenshot-03-live-sovereign-1280x800.png", scrollY: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

for (const shot of shots) {
  await page.goto(shot.url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  if (shot.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY);
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: join(outDir, shot.name), type: "png" });
  console.log(`✓ ${shot.name}`);
}

await browser.close();
console.log(`\nSaved to ${outDir}`);
