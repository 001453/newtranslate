import {
  completion,
  downloadAsset,
  loadModel,
  translate,
  unloadModel,
  QWEN3_600M_INST_Q4,
  VERBOSITY,
  type ModelProgressUpdate,
} from "@qvac/sdk";
import { bergamotPairSupported, resolveBergamotModel } from "./bergamot";

export type ProgressCallback = (label: string, pct: number | null) => void;

const THINK_OPEN = "<" + "think" + ">";
const THINK_CLOSE = "</" + "think" + ">";

function stripThink(text: string): string {
  let t = text.trim();
  const closeIdx = t.toLowerCase().indexOf(THINK_CLOSE.toLowerCase());
  if (closeIdx !== -1) {
    const after = t.slice(closeIdx + THINK_CLOSE.length).trim();
    if (after) return after;
  }
  t = t.replace(new RegExp(THINK_OPEN + "[\\s\\S]*?" + THINK_CLOSE, "gi"), "").trim();
  return t.replace(/^(output|translation|answer|çeviri):\s*/i, "").trim();
}

let llmModelId: string | null = null;
let llmLoading = false;
const nmtModels = new Map<string, string>();
const nmtLoading = new Set<string>();
let llmChain: Promise<unknown> = Promise.resolve();

function withLlmLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = llmChain.then(fn);
  llmChain = run.catch(() => {});
  return run;
}

async function ensureLlm(onProgress?: ProgressCallback): Promise<string> {
  if (llmModelId) return llmModelId;
  if (llmLoading) {
    while (llmLoading) await new Promise((r) => setTimeout(r, 200));
    if (llmModelId) return llmModelId;
  }
  llmLoading = true;
  try {
    onProgress?.("Downloading translation model…", 0);
    await downloadAsset({
      assetSrc: QWEN3_600M_INST_Q4,
      onProgress: (p: ModelProgressUpdate) => {
        if (p.percentage != null) onProgress?.("Downloading translation model…", Math.round(p.percentage));
      },
    });
    onProgress?.("Loading translation model…", null);
    llmModelId = await loadModel({
      modelSrc: QWEN3_600M_INST_Q4,
      modelType: "llm",
      modelConfig: {
        device: "gpu",
        ctx_size: 2048,
        verbosity: VERBOSITY.ERROR,
      },
      onProgress: (p: ModelProgressUpdate) => {
        if (p.percentage != null) onProgress?.("Loading translation model…", Math.round(p.percentage));
      },
    });
    return llmModelId;
  } finally {
    llmLoading = false;
  }
}

async function ensureBergamot(from: string, to: string, onProgress?: ProgressCallback) {
  const pair = resolveBergamotModel(from, to);
  if (!pair) return null;

  const key = `${pair.from}-${pair.to}`;
  if (nmtModels.has(key)) return { modelId: nmtModels.get(key)!, ...pair };

  if (nmtLoading.has(key)) {
    while (nmtLoading.has(key)) await new Promise((r) => setTimeout(r, 200));
    if (nmtModels.has(key)) return { modelId: nmtModels.get(key)!, ...pair };
    return null;
  }

  nmtLoading.add(key);
  try {
    onProgress?.(`Downloading ${key} model…`, 0);
    await downloadAsset({
      assetSrc: pair.modelSrc as Parameters<typeof downloadAsset>[0]["assetSrc"],
      onProgress: (p: ModelProgressUpdate) => {
        if (p.percentage != null) onProgress?.(`Downloading ${key} model…`, Math.round(p.percentage));
      },
    });
    onProgress?.(`Loading ${key} model…`, null);
    const modelId = await loadModel({
      modelSrc: pair.modelSrc,
      modelType: "nmt",
      modelConfig: {
        engine: "Bergamot",
        from: pair.from,
        to: pair.to,
        beamsize: 1,
        normalize: 1,
        temperature: 0,
      },
      onProgress: (p: ModelProgressUpdate) => {
        if (p.percentage != null) onProgress?.(`Loading ${key} model…`, Math.round(p.percentage));
      },
    } as unknown as Parameters<typeof loadModel>[0]);
    nmtModels.set(key, modelId);
    return { modelId, ...pair };
  } finally {
    nmtLoading.delete(key);
  }
}

async function translateWithLlm(text: string, from: string, to: string): Promise<string> {
  return withLlmLock(async () => {
    const modelId = await ensureLlm();
    const run = completion({
      modelId,
      history: [
        {
          role: "system",
          content: `Translate to ${to}. Output only the translation. Never use ${THINK_OPEN} tags.`,
        },
        {
          role: "user",
          content: `Translate from ${from} to ${to}:\n${text}`,
        },
      ],
      stream: false,
      generationParams: { temp: 0.1, predict: 120 },
    });
    const final = await run.final;
    return stripThink(final?.contentText || "");
  });
}

async function translateWithBergamot(text: string, from: string, to: string, onProgress?: ProgressCallback) {
  const loaded = await ensureBergamot(from, to, onProgress);
  if (!loaded) return null;

  const result = translate({
    modelId: loaded.modelId,
    text,
    modelType: "nmt",
    stream: false,
  });
  const out = String((await result.text) || "").trim();
  return out || null;
}

/** Warm up models for default pair (en → tr). */
export async function initEngine(onProgress?: ProgressCallback): Promise<void> {
  if (bergamotPairSupported("en", "tr")) {
    await ensureBergamot("en", "tr", onProgress);
  } else {
    await ensureLlm(onProgress);
  }
  onProgress?.("Ready", null);
}

export async function translateText(
  text: string,
  from: string,
  to: string,
  onProgress?: ProgressCallback,
): Promise<{ text: string; engine: "bergamot" | "llm" }> {
  const trimmed = text.trim();
  if (!trimmed) return { text: "", engine: "llm" };

  if (bergamotPairSupported(from, to)) {
    const berg = await translateWithBergamot(trimmed, from, to, onProgress);
    if (berg) return { text: berg, engine: "bergamot" };
  }

  onProgress?.("Translating (LLM)…", null);
  const llm = await translateWithLlm(trimmed, from, to);
  return { text: llm, engine: "llm" };
}

export function pairHint(from: string, to: string): string {
  if (bergamotPairSupported(from, to)) return "Bergamot (fast, on-device)";
  return "QVAC LLM (on-device)";
}

export async function shutdownEngine(): Promise<void> {
  for (const id of nmtModels.values()) {
    await unloadModel({ modelId: id, clearStorage: false }).catch(() => {});
  }
  nmtModels.clear();
  if (llmModelId) {
    await unloadModel({ modelId: llmModelId, clearStorage: false }).catch(() => {});
    llmModelId = null;
  }
}
