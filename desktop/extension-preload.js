const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  getExtensionInfo: () => ipcRenderer.invoke("ext:getInfo"),
  openExtensionFolder: () => ipcRenderer.invoke("ext:openFolder"),
  openChromeExtensions: () => ipcRenderer.invoke("ext:openChrome"),
});
