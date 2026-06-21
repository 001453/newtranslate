const { spawn } = require("child_process");
const path = require("path");
const { app } = require("electron");
const { getAppRoot, getNodeSpawnOptions } = require("./paths");

function runSetup(logFn) {
  return new Promise((resolve) => {
    const root = getAppRoot();
    const scriptName = app.isPackaged ? "setup-packaged.mjs" : "setup.mjs";
    const setupScript = path.join(root, "scripts", scriptName);
    const { node, env } = getNodeSpawnOptions();
    const isWin = process.platform === "win32";

    const child = spawn(node, [setupScript], {
      cwd: root,
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: false,
    });

    child.stdout?.on("data", (d) => {
      if (logFn) logFn(String(d));
    });
    child.stderr?.on("data", (d) => {
      if (logFn) logFn(String(d));
    });

    child.on("exit", (code) => {
      resolve({ ok: code === 0, code });
    });

    child.on("error", (err) => {
      resolve({ ok: false, error: String(err.message || err) });
    });
  });
}

function checkPython() {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "python" : "python3";
    const child = spawn(cmd, ["--version"], { shell: isWin, windowsHide: true });
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

module.exports = { runSetup, checkPython };
