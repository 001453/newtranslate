const myLangEl = document.getElementById("myLang");
const otherLangEl = document.getElementById("otherLang");
const toggleEl = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");

let active = false;

async function loadSettings() {
  const data = await chrome.storage.local.get(["myLang", "otherLang"]);
  if (data.myLang) myLangEl.value = data.myLang;
  if (data.otherLang) otherLangEl.value = data.otherLang;
}

async function saveSettings() {
  await chrome.storage.local.set({
    myLang: myLangEl.value,
    otherLang: otherLangEl.value,
  });
}

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function setError(text) {
  if (text) {
    errorEl.textContent = text;
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
  }
}

async function refreshStatus() {
  const res = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  active = Boolean(res?.sessionActive);
  toggleEl.textContent = active ? "Stop captions" : "Start captions";
  toggleEl.classList.toggle("stop", active);
  if (active && res?.connected) {
    setStatus("Live — captions on tab", "live");
  } else if (active) {
    setStatus("Connecting…", "live");
  } else {
    setStatus("Idle", "idle");
  }
}

myLangEl.addEventListener("change", () => void saveSettings());
otherLangEl.addEventListener("change", () => void saveSettings());

toggleEl.addEventListener("click", async () => {
  toggleEl.disabled = true;
  setError("");
  try {
    await saveSettings();
    if (active) {
      const res = await chrome.runtime.sendMessage({ type: "STOP_SESSION" });
      if (!res?.ok) throw new Error(res?.error || "Stop failed");
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const res = await chrome.runtime.sendMessage({ type: "START_SESSION", tabId: tab?.id });
      if (!res?.ok) throw new Error(res?.error || "Start failed — is backend running?");
    }
  } catch (err) {
    setError(String(err?.message || err));
    setStatus("Error", "error");
  } finally {
    await refreshStatus();
    toggleEl.disabled = false;
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATUS") {
    if (msg.payload?.error) setError(String(msg.payload.error));
    void refreshStatus();
  }
  if (msg.type === "ERROR") {
    setError(String(msg.payload?.message || "Pipeline error"));
    setStatus("Error", "error");
  }
});

await loadSettings();
await refreshStatus();
