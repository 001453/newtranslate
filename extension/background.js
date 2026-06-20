const DEFAULT_WS = "ws://127.0.0.1:8000/api/v1/ws/live";

let ws = null;
let sessionActive = false;
let captureTabId = null;

async function getSettings() {
  const data = await chrome.storage.local.get(["myLang", "otherLang", "wsUrl"]);
  return {
    myLang: data.myLang || "tr",
    otherLang: data.otherLang || "en",
    wsUrl: data.wsUrl || DEFAULT_WS,
  };
}

function broadcast(type, payload) {
  const msg = { type, payload };
  if (captureTabId != null) {
    chrome.tabs.sendMessage(captureTabId, msg).catch(() => {});
  }
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function closeWs() {
  if (ws) {
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  }
}

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    closeWs();
    const socket = new WebSocket(wsUrl);
    socket.binaryType = "arraybuffer";

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("WebSocket timeout"));
    }, 8000);

    socket.onopen = () => {
      clearTimeout(timeout);
      ws = socket;
      resolve(socket);
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket failed"));
    };
  });
}

function attachWsHandlers() {
  if (!ws) return;
  ws.onmessage = (ev) => {
    if (typeof ev.data !== "string") return;
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    switch (msg.event) {
      case "caption_show":
      case "caption_update":
        broadcast("CAPTION", msg.payload);
        break;
      case "caption_hide":
        broadcast("CAPTION_CLEAR", null);
        break;
      case "error":
        broadcast("ERROR", msg.payload);
        break;
      default:
        break;
    }
  };
  ws.onclose = () => {
    ws = null;
    if (sessionActive) broadcast("STATUS", { connected: false, capturing: false, error: "Disconnected" });
    sessionActive = false;
  };
}

function startSession(config) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "start_session", config }));
  }
}

function stopSession(myLang) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "stop_session", language: myLang }));
  }
}

function sendPcm(pcmBytes) {
  if (ws?.readyState === WebSocket.OPEN && sessionActive) {
    ws.send(pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + pcmBytes.byteLength));
  }
}

async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (existing.length) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Capture tab audio for local live translation",
  });
}

async function startCapture(tabId) {
  await ensureOffscreen();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const res = await chrome.runtime.sendMessage({ type: "OFFSCREEN_START", streamId });
  if (!res?.ok) throw new Error(res?.error || "Tab capture failed");
}

async function stopCapture() {
  await chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP" }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    sendResponse({
      sessionActive,
      connected: ws?.readyState === WebSocket.OPEN,
      captureTabId,
    });
    return false;
  }

  if (msg.type === "PCM_CHUNK") {
    const bytes = new Uint8Array(msg.pcm);
    sendPcm(bytes);
    return false;
  }

  if (msg.type === "START_SESSION") {
    void (async () => {
      try {
        const settings = await getSettings();
        const tabId = msg.tabId ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
        if (!tabId) throw new Error("No active tab");

        captureTabId = tabId;
        await connectWs(settings.wsUrl);
        attachWsHandlers();

        const config = {
          source_lang: settings.otherLang,
          target_lang: settings.myLang,
          bidirectional: true,
          lang_a: settings.myLang,
          lang_b: settings.otherLang,
          viewer_lang: settings.myLang,
        };

        startSession(config);
        await startCapture(tabId);
        sessionActive = true;
        broadcast("STATUS", { connected: true, capturing: true, error: null });
        sendResponse({ ok: true });
      } catch (err) {
        sessionActive = false;
        captureTabId = null;
        closeWs();
        await stopCapture();
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
    })();
    return true;
  }

  if (msg.type === "STOP_SESSION") {
    void (async () => {
      const settings = await getSettings();
      stopSession(settings.myLang);
      sessionActive = false;
      await stopCapture();
      closeWs();
      broadcast("CAPTION_CLEAR", null);
      broadcast("STATUS", { connected: false, capturing: false, error: null });
      captureTabId = null;
      sendResponse({ ok: true });
    })();
    return true;
  }

  return false;
});
