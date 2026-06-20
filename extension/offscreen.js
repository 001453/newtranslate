import { startPcmCapture } from "./lib/pcm.js";

const CHUNK_MS = 1000;
const OVERLAP_MS = 350;
const MIN_RMS = 0.003;

let stopCapture = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "OFFSCREEN_START") {
    void start(msg.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }
  if (msg.type === "OFFSCREEN_STOP") {
    stop();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

async function start(streamId) {
  stop();
  const ctx = new AudioContext({ latencyHint: "interactive" });
  await ctx.resume();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  stopCapture = await startPcmCapture(
    { ctx, stream, chunkMs: CHUNK_MS, minRmsToSend: MIN_RMS, overlapMs: OVERLAP_MS },
    {
      onChunk: (pcm) => {
        chrome.runtime.sendMessage({ type: "PCM_CHUNK", pcm: Array.from(new Uint8Array(pcm)) }).catch(() => {});
      },
    },
  );
}

function stop() {
  stopCapture?.();
  stopCapture = null;
}
