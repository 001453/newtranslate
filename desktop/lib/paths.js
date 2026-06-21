const { app } = require("electron");
const path = require("path");
const { existsSync } = require("fs");

function getAppRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app");
  }
  return path.resolve(__dirname, "..", "..");
}

function getUserDataPath() {
  return app.getPath("userData");
}

function getBackendVenvPython() {
  const root = getAppRoot();
  const isWin = process.platform === "win32";
  return path.join(root, "backend", ".venv", isWin ? "Scripts/python.exe" : "bin/python");
}

function isSetupComplete() {
  const root = getAppRoot();
  const venvPy = getBackendVenvPython();
  const qvacNodeModules = path.join(root, "qvac-service", "node_modules");
  const frontendNext = path.join(root, "frontend", ".next");
  const frontendNodeModules = path.join(root, "frontend", "node_modules");
  return (
    existsSync(venvPy) &&
    existsSync(qvacNodeModules) &&
    existsSync(frontendNodeModules) &&
    (existsSync(frontendNext) || !app.isPackaged)
  );
}

function getNodeSpawnOptions() {
  const env = { ...process.env };
  if (app.isPackaged || process.versions.electron) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }
  return {
    node: process.execPath,
    env,
  };
}

function getExtensionPath() {
  return path.join(getAppRoot(), "extension");
}

function getExtensionZipPath() {
  return path.join(getUserDataPath(), "GlobalBridge-Extension.zip");
}

module.exports = {
  getAppRoot,
  getUserDataPath,
  getBackendVenvPython,
  isSetupComplete,
  getNodeSpawnOptions,
  getExtensionPath,
  getExtensionZipPath,
};
