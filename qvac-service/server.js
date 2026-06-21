/**
 * GlobalBridge AI — QVAC Local AI Bridge
 *
 * Tüm inference bu process içinde kalır. Veri dışarı çıkmaz.
 * https://qvac.tether.io/ | https://docs.qvac.tether.io/sdk/getting-started/
 *
 * Endpoints (localhost only):
 *   GET  /health
 *   POST /completion   — LLM çeviri (desteklenmeyen dil çiftleri)
 *   POST /translate    — Bergamot NMT (Parley / Firefox Translations tarzı)
 *   POST /transcribe   — Whisper STT (opsiyonel)
 */

import cors from "cors";
import express from "express";
import {
  loadModel,
  unloadModel,
  completion,
  translate,
  transcribe,
  QWEN3_600M_INST_Q4,
  LLAMA_3_2_1B_INST_Q4_0,
  WHISPER_BASE_Q8_0,
  WHISPER_TINY_Q8_0,
} from "@qvac/sdk";
import { bergamotPairSupported, listBergamotPairs, resolveBergamotModel } from "./bergamot-pairs.js";

const PORT = Number(process.env.QVAC_BRIDGE_PORT || 8765);
const HOST = process.env.QVAC_BRIDGE_HOST || "127.0.0.1";
const LLM_MODEL = process.env.QVAC_LLM_MODEL || "QWEN3_600M_INST_Q4";
const WHISPER_MODEL = process.env.QVAC_WHISPER_MODEL || "WHISPER_BASE_Q8_0";

const MODEL_MAP = {
  QWEN3_600M_INST_Q4,
  LLAMA_3_2_1B_INST_Q4_0,
};

const WHISPER_MAP = {
  WHISPER_BASE_Q8_0,
  WHISPER_TINY_Q8_0,
};

let llmModelId = null;
let llmLoading = false;
let whisperModelId = null;
let whisperLoading = false;

/** @type {Map<string, string>} */
const nmtModelIds = new Map();
/** @type {Set<string>} */
const nmtLoading = new Set();

/** QVAC allows only one LLM completion at a time — serialize all completion calls. */
let llmChain = Promise.resolve();

function withLlmLock(fn) {
  const run = llmChain.then(() => fn());
  llmChain = run.catch(() => {});
  return run;
}

const app = express();
app.use(cors({ origin: false }));
app.use(express.json({ limit: "10mb" }));

const THINK_OPEN = "<" + "think" + ">";
const THINK_CLOSE = "</" + "think" + ">";

function cleanPrefix(s) {
  return String(s || "")
    .replace(/^(output|translation|answer|final|result|çeviri):\s*/i, "")
    .trim();
}

function pickTranslationLine(lines) {
  const good = lines.filter(
    (l) =>
      l.length > 0 &&
      l.length < 120 &&
      !/^ok\b/i.test(l) &&
      !/^let /i.test(l) &&
      !/^i need/i.test(l) &&
      !/^the user/i.test(l) &&
      !/^so the/i.test(l) &&
      !/^no need/i.test(l) &&
      !/^first,?/i.test(l)
  );
  if (!good.length) return "";
  return good[good.length - 1];
}

function stripThink(text) {
  if (!text || typeof text !== "string") return "";
  let t = text.trim();

  const closeRe = new RegExp(THINK_CLOSE, "i");
  const closeIdx = t.search(closeRe);
  if (closeIdx !== -1) {
    const after = t.slice(closeIdx + THINK_CLOSE.length).trim();
    if (after) return cleanPrefix(after);
  }

  const openRe = new RegExp(THINK_OPEN, "i");
  const openIdx = t.search(openRe);
  if (openIdx !== -1) {
    let inner = t.slice(openIdx + THINK_OPEN.length);
    inner = inner.replace(new RegExp(THINK_CLOSE + "[\\s\\S]*$", "i"), "").trim();
    const lines = inner.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const picked = pickTranslationLine(lines);
    if (picked) return cleanPrefix(picked);
  }

  t = t.replace(new RegExp(THINK_OPEN + "[\\s\\S]*?" + THINK_CLOSE, "gi"), "").trim();
  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1) return cleanPrefix(lines[0]);
  const picked = pickTranslationLine(lines);
  return cleanPrefix(picked || lines[lines.length - 1] || t);
}

async function ensureLlmLoaded() {
  if (llmModelId) return llmModelId;
  if (llmLoading) {
    while (llmLoading) await new Promise((r) => setTimeout(r, 200));
    return llmModelId;
  }
  llmLoading = true;
  try {
    const modelSrc = MODEL_MAP[LLM_MODEL] || QWEN3_600M_INST_Q4;
    console.log(`[QVAC] Loading local LLM: ${LLM_MODEL}...`);
    llmModelId = await loadModel({
      modelSrc,
      modelType: "llm",
      modelConfig: { ctx_size: 4096 },
      onProgress: (p) => {
        if (p.percentage != null) {
          console.log(`[QVAC] LLM load: ${p.percentage.toFixed(1)}%`);
        }
      },
    });
    console.log(`[QVAC] LLM ready: ${llmModelId}`);
    return llmModelId;
  } finally {
    llmLoading = false;
  }
}

/** Wrap mono int16 PCM @ 16 kHz for whisper.cpp */
function pcm16ToWav(pcmBuffer, sampleRate = 16000) {
  const dataSize = pcmBuffer.length;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wav, 44);
  return wav;
}

async function ensureWhisperLoaded() {
  if (whisperModelId) return whisperModelId;
  if (whisperLoading) {
    while (whisperLoading) await new Promise((r) => setTimeout(r, 200));
    return whisperModelId;
  }
  whisperLoading = true;
  try {
    const modelSrc = WHISPER_MAP[WHISPER_MODEL] || WHISPER_BASE_Q8_0;
    console.log(`[QVAC] Loading Whisper STT: ${WHISPER_MODEL}...`);
    whisperModelId = await loadModel({
      modelSrc,
      modelType: "whisper",
      onProgress: (p) => {
        if (p.percentage != null) {
          console.log(`[QVAC] Whisper load: ${p.percentage.toFixed(1)}%`);
        }
      },
    });
    console.log(`[QVAC] Whisper ready: ${whisperModelId}`);
    return whisperModelId;
  } finally {
    whisperLoading = false;
  }
}

async function ensureBergamotLoaded(from, to) {
  const pair = resolveBergamotModel(from, to);
  if (!pair) return null;

  const key = `${pair.from}-${pair.to}`;
  if (nmtModelIds.has(key)) return { modelId: nmtModelIds.get(key), ...pair };

  if (nmtLoading.has(key)) {
    while (nmtLoading.has(key)) await new Promise((r) => setTimeout(r, 200));
    if (nmtModelIds.has(key)) return { modelId: nmtModelIds.get(key), ...pair };
    return null;
  }

  nmtLoading.add(key);
  try {
    console.log(`[QVAC] Loading Bergamot NMT: ${key}...`);
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
        norepeatngramsize: 3,
        lengthpenalty: 1.0,
      },
      onProgress: (p) => {
        if (p.percentage != null) {
          console.log(`[QVAC] Bergamot ${key}: ${p.percentage.toFixed(1)}%`);
        }
      },
    });
    nmtModelIds.set(key, modelId);
    console.log(`[QVAC] Bergamot ready: ${key} → ${modelId}`);
    return { modelId, ...pair };
  } finally {
    nmtLoading.delete(key);
  }
}

async function translateWithBergamot(text, from, to) {
  const loaded = await ensureBergamotLoaded(from, to);
  if (!loaded) return null;

  const result = translate({
    modelId: loaded.modelId,
    text,
    modelType: "nmt",
    stream: false,
  });
  const translated = String((await result.text) || "").trim();
  return translated || null;
}

async function translateWithLlm(text, from, to) {
  return withLlmLock(async () => {
    const modelId = await ensureLlmLoaded();
    const tgt = to || "en";
    const src = from && from !== "auto" ? from : "auto";
    const history = [
      {
        role: "system",
        content: `Translate to ${tgt}. Output only the translation, nothing else. Never use ${THINK_OPEN} tags.`,
      },
      {
        role: "user",
        content: `Translate from ${src} to ${tgt}:\n${text}`,
      },
    ];

    const run = completion({
      modelId,
      history,
      stream: false,
      generationParams: { temp: 0.1, predict: 80 },
    });
    const final = await run.final;
    return stripThink((final?.contentText || "").trim());
  });
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    provider: "qvac",
    local_only: true,
    data_egress: false,
    llm_loaded: Boolean(llmModelId),
    llm_model: LLM_MODEL,
    whisper_loaded: Boolean(whisperModelId),
    whisper_model: WHISPER_MODEL,
    nmt_loaded: [...nmtModelIds.keys()],
    bergamot_pairs: listBergamotPairs().length,
    docs: "https://qvac.tether.io/",
  });
});

/** LLM completion — yedek (Bergamot desteklemeyen çiftler) */
app.post("/completion", async (req, res) => {
  try {
    const { system, user } = req.body;
    if (!user) return res.status(400).json({ error: "user message required" });

    const payload = await withLlmLock(async () => {
      const modelId = await ensureLlmLoaded();
      const history = [];
      const sys =
        (system || "") +
        " Never use " +
        THINK_OPEN +
        " tags. Output only the final translation, one short phrase.";
      history.push({ role: "system", content: sys });
      history.push({ role: "user", content: String(user) });

      const run = completion({
        modelId,
        history,
        stream: false,
        generationParams: { temp: 0.1, predict: 80 },
      });
      const final = await run.final;
      const text = stripThink((final?.contentText || "").trim());
      return {
        text,
        model: LLM_MODEL,
        provider: "qvac-local",
        data_egress: false,
        stats: final?.stats || null,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error("[QVAC] completion error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

/** Bergamot NMT — Parley / Firefox Translations tarzı düz çeviri */
app.post("/translate", async (req, res) => {
  try {
    const { text, from, to } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });

    const fromLang = from || "auto";
    const toLang = to || "en";

    if (bergamotPairSupported(fromLang, toLang)) {
      const translated = await translateWithBergamot(text, fromLang, toLang);
      if (translated) {
        return res.json({
          text: translated,
          from: fromLang,
          to: toLang,
          engine: "bergamot",
          provider: "qvac-local",
          data_egress: false,
        });
      }
    }

    const fallback = await translateWithLlm(text, fromLang, toLang);
    res.json({
      text: fallback,
      from: fromLang,
      to: toLang,
      engine: "llm",
      provider: "qvac-local",
      data_egress: false,
    });
  } catch (err) {
    console.error("[QVAC] translate error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

/** Whisper STT via @qvac/sdk whisper.cpp — mono PCM int16 @ 16 kHz or WAV base64 */
app.post("/transcribe", async (req, res) => {
  try {
    const { audio_base64, language, sample_rate: sampleRate = 16000 } = req.body;
    if (!audio_base64) return res.status(400).json({ error: "audio_base64 required" });

    const modelId = await ensureWhisperLoaded();
    const raw = Buffer.from(audio_base64, "base64");
    const audioChunk = raw.length >= 4 && raw.toString("ascii", 0, 4) === "RIFF" ? raw : pcm16ToWav(raw, sampleRate);

    const text = await transcribe({
      modelId,
      audioChunk,
      ...(language ? { prompt: `Language: ${language}` } : {}),
    });

    res.json({
      text: typeof text === "string" ? text.trim() : "",
      language: language || "auto",
      provider: "qvac-whisper",
      engine: "whispercpp",
      data_egress: false,
    });
  } catch (err) {
    console.error("[QVAC] transcribe error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[QVAC Bridge] Listening on http://${HOST}:${PORT} — LOCAL ONLY, zero egress`);
  console.log(`[QVAC Bridge] Bergamot pairs available: ${listBergamotPairs().length}`);
});

process.on("SIGINT", async () => {
  for (const modelId of nmtModelIds.values()) {
    await unloadModel({ modelId });
  }
  if (llmModelId) {
    await unloadModel({ modelId: llmModelId });
  }
  if (whisperModelId) {
    await unloadModel({ modelId: whisperModelId });
  }
  process.exit(0);
});
