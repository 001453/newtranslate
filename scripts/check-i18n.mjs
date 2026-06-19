#!/usr/bin/env node
/**
 * Ensure en/tr i18n catalogs share the same key structure.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function extractKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...extractKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function loadMessages(relPath) {
  const src = readFileSync(join(root, relPath), "utf8");
  const match =
    src.match(/export const en\s*=\s*(\{[\s\S]*?\})\s*as const;/) ??
    src.match(/export const tr(?::\s*Messages)?\s*=\s*(\{[\s\S]*?\});/);
  if (!match) throw new Error(`Could not parse ${relPath}`);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${match[1]});`)();
}

const en = loadMessages("frontend/src/lib/i18n/en.ts");
const tr = loadMessages("frontend/src/lib/i18n/tr.ts");

const enKeys = extractKeys(en);
const trKeys = extractKeys(tr);

const missingInTr = enKeys.filter((k) => !trKeys.includes(k));
const missingInEn = trKeys.filter((k) => !enKeys.includes(k));

if (missingInTr.length || missingInEn.length) {
  if (missingInTr.length) console.error("Missing in tr.ts:", missingInTr.join(", "));
  if (missingInEn.length) console.error("Missing in en.ts:", missingInEn.join(", "));
  process.exit(1);
}

console.log(`i18n OK (${enKeys.length} keys)`);
