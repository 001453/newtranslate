const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  getState: () => ipcRenderer.invoke("wizard:getState"),
  runSetup: () => ipcRenderer.invoke("wizard:runSetup"),
  startServices: () => ipcRenderer.invoke("wizard:startServices"),
  openApp: () => ipcRenderer.invoke("wizard:openApp"),
  openExtensionGuide: () => ipcRenderer.invoke("wizard:openExtensionGuide"),
  onLog: (cb) => {
    const handler = (_ev, line) => cb(line);
    ipcRenderer.on("wizard:log", handler);
    return () => ipcRenderer.removeListener("wizard:log", handler);
  },
  onState: (cb) => {
    const handler = (_ev, state) => cb(state);
    ipcRenderer.on("wizard:state", handler);
    return () => ipcRenderer.removeListener("wizard:state", handler);
  },
});
