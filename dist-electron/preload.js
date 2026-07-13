// src/main/preload.ts
var import_electron = require("electron");
var allowedChannels = /* @__PURE__ */ new Set(["browser:launch", "browser:read-fields", "browser:autofill", "auth:send-otp", "auth:verify-otp"]);
import_electron.contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => {
    if (!allowedChannels.has(channel)) {
      throw new Error(`IPC channel not allowed: ${channel}`);
    }
    return import_electron.ipcRenderer.invoke(channel, data);
  },
  launchBrowser: (url, browserType) => {
    return import_electron.ipcRenderer.invoke("browser:launch", { url, browserType });
  },
  readFormFields: () => {
    return import_electron.ipcRenderer.invoke("browser:read-fields");
  },
  autofillForm: (profileFields) => {
    return import_electron.ipcRenderer.invoke("browser:autofill", profileFields);
  },
  sendPasswordOtp: (email) => {
    return import_electron.ipcRenderer.invoke("auth:send-otp", email);
  },
  verifyPasswordOtp: (email, otp) => {
    return import_electron.ipcRenderer.invoke("auth:verify-otp", { email, otp });
  }
});
//# sourceMappingURL=preload.js.map
