/** Bergamot NMT pair registry (mirrors qvac-service/bergamot-pairs.js) */
import * as sdk from "@qvac/sdk";

function norm(code: string): string {
  const c = String(code || "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
  if (c === "auto") return "en";
  if (c === "nb" || c === "nn") return "no";
  return c;
}

const MODEL_BY_PAIR: Record<string, unknown> = {};

for (const [exportName, value] of Object.entries(sdk)) {
  const m = /^BERGAMOT_([A-Z]{2,3})_([A-Z]{2,3})$/.exec(exportName);
  if (m && value && typeof value === "object") {
    MODEL_BY_PAIR[`${m[1].toLowerCase()}-${m[2].toLowerCase()}`] = value;
  }
}

export function bergamotPairSupported(from: string, to: string): boolean {
  return Boolean(MODEL_BY_PAIR[`${norm(from)}-${norm(to)}`]);
}

export function listBergamotPairs(): string[] {
  return Object.keys(MODEL_BY_PAIR);
}

export function resolveBergamotModel(from: string, to: string) {
  const f = norm(from);
  const t = norm(to);
  const modelSrc = MODEL_BY_PAIR[`${f}-${t}`];
  if (!modelSrc) return null;
  return { from: f, to: t, modelSrc };
}
