/**
 * GlobalBridge AI — Desktop launcher (Phase 1)
 * System tray app: setup wizard, start/stop local stack, open browser + extension guide.
 */

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
  ipcMain,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { getHealth, waitForReady } = require("./lib/health");
const { startAll, stopAll, isRunning } = require("./lib/services");
const { runSetup, checkPython, hasBundledPython } = require("./lib/setup");
const {
  getAppRoot,
  isSetupComplete,
  getExtensionPath,
  getUserDataPath,
} = require("./lib/paths");

const APP_URL = process.env.GB_APP_URL || "http://localhost:3000";
const isDev = process.argv.includes("--dev");

let tray = null;
let wizardWindow = null;
let extWindow = null;
let setupRunning = false;
let autoStartDone = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showWizard();
  });
}

function iconPath(name) {
  return path.join(__dirname, "icons", name);
}

function loadTrayIcon() {
  const png = iconPath("icon16.png");
  if (fs.existsSync(png)) {
    return nativeImage.createFromPath(png);
  }
  return nativeImage.createEmpty();
}

function sendWizardLog(line) {
  wizardWindow?.webContents.send("wizard:log", line);
}

async function collectState() {
  const health = await getHealth();
  return {
    python: await checkPython(),
    pythonBundled: hasBundledPython(),
    setupComplete: isSetupComplete(),
    setupRunning,
    servicesRunning: isRunning() || health.qvac || health.api || health.web,
    health,
  };
}

async function broadcastState() {
  const state = await collectState();
  wizardWindow?.webContents.send("wizard:state", state);
  updateTrayMenu(state);
  return state;
}

function showWizard() {
  if (wizardWindow && !wizardWindow.isDestroyed()) {
    wizardWindow.show();
    wizardWindow.focus();
    return;
  }

  wizardWindow = new BrowserWindow({
    width: 560,
    height: 640,
    title: "GlobalBridge AI",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "wizard-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  wizardWindow.loadFile(path.join(__dirname, "wizard.html"));
  wizardWindow.on("closed", () => {
    wizardWindow = null;
  });

  if (isDev) {
    wizardWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function showExtensionGuide() {
  if (extWindow && !extWindow.isDestroyed()) {
    extWindow.show();
    extWindow.focus();
    return;
  }

  extWindow = new BrowserWindow({
    width: 520,
    height: 520,
    title: "Chrome Extension — GlobalBridge",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "extension-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  extWindow.loadFile(path.join(__dirname, "extension-guide.html"));
  extWindow.on("closed", () => {
    extWindow = null;
  });
}

function openApp() {
  shell.openExternal(APP_URL);
}

async function runFirstTimeSetup() {
  if (setupRunning || isSetupComplete()) return null;

  const hasPython = await checkPython();
  if (!hasPython) {
    sendWizardLog("ERROR: Python runtime missing. Reinstall GlobalBridge AI.\n");
    return { ok: false, error: "Python not found" };
  }

  setupRunning = true;
  await broadcastState();
  sendWizardLog("First run — installing AI components (~5–15 min). Keep this window open.\n\n");

  const result = await runSetup((line) => sendWizardLog(line));
  setupRunning = false;
  await broadcastState();
  return result;
}

async function ensureAutoStart() {
  if (autoStartDone) return;
  autoStartDone = true;

  if (!isSetupComplete()) {
    showWizard();
    if (app.isPackaged && !isDev) {
      setTimeout(async () => {
        const setupResult = await runFirstTimeSetup();
        if (!setupResult?.ok) return;

        sendWizardLog("\n--- Starting services ---\n");
        const startResult = await startAll((line) => sendWizardLog(line + "\n"));
        if (!startResult.ok) return;

        await waitForReady(120000);
        await broadcastState();
        if ((await getHealth()).ready) openApp();
      }, 600);
    }
    return;
  }

  const health = await getHealth();
  if (health.ready) return;

  const result = await startAll((line) => sendWizardLog(line + "\n"));
  if (!result.ok) {
    showWizard();
    return;
  }

  await waitForReady(90000);
  await broadcastState();
}

function updateTrayMenu(state) {
  if (!tray) return;

  const ready = state?.health?.ready;
  const setupOk = state?.setupComplete;

  const menu = Menu.buildFromTemplate([
    {
      label: ready ? "● Running" : "○ Stopped",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Open GlobalBridge",
      enabled: ready,
      click: () => openApp(),
    },
    {
      label: "Setup wizard",
      click: () => showWizard(),
    },
    { type: "separator" },
    {
      label: "Start services",
      enabled: setupOk && !ready,
      click: async () => {
        await startAll((line) => sendWizardLog(line + "\n"));
        await waitForReady(90000);
        await broadcastState();
      },
    },
    {
      label: "Stop services",
      enabled: ready || isRunning(),
      click: async () => {
        stopAll();
        await broadcastState();
      },
    },
    { type: "separator" },
    {
      label: "Chrome extension guide",
      click: () => showExtensionGuide(),
    },
    {
      label: "Open extension folder",
      click: () => shell.openPath(getExtensionPath()),
    },
    { type: "separator" },
    {
      label: "Quit GlobalBridge",
      click: () => {
        stopAll();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip(ready ? "GlobalBridge AI — Running" : "GlobalBridge AI — Stopped");
}

function createTray() {
  tray = new Tray(loadTrayIcon());
  tray.setToolTip("GlobalBridge AI");
  tray.on("double-click", () => {
    getHealth().then((h) => {
      if (h.ready) openApp();
      else showWizard();
    });
  });
  void broadcastState();
}

function registerIpc() {
  ipcMain.handle("wizard:getState", () => collectState());

  ipcMain.handle("wizard:runSetup", async () => {
    const result = await runFirstTimeSetup();
    return result ?? { ok: true };
  });

  ipcMain.handle("wizard:startServices", async () => {
    const result = await startAll((line) => sendWizardLog(line + "\n"));
    if (result.ok) {
      await waitForReady(120000);
    }
    await broadcastState();
    return result;
  });

  ipcMain.handle("wizard:openApp", () => {
    openApp();
  });

  ipcMain.handle("wizard:openExtensionGuide", () => {
    showExtensionGuide();
  });

  ipcMain.handle("ext:getInfo", () => ({
    path: getExtensionPath(),
    zip: path.join(getUserDataPath(), "GlobalBridge-Extension.zip"),
  }));

  ipcMain.handle("ext:openFolder", () => shell.openPath(getExtensionPath()));

  ipcMain.handle("ext:openChrome", () => shell.openExternal("chrome://extensions"));
}

app.whenReady().then(async () => {
  fs.mkdirSync(getUserDataPath(), { recursive: true });
  registerIpc();
  createTray();
  await ensureAutoStart();
  await broadcastState();
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("before-quit", () => {
  stopAll();
});

process.on("uncaughtException", (err) => {
  dialog.showErrorBox("GlobalBridge AI", String(err?.message || err));
});
