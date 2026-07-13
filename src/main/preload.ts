import { contextBridge, ipcRenderer } from "electron";

const allowedChannels = new Set(["browser:launch", "browser:read-fields", "browser:autofill", "auth:send-otp", "auth:verify-otp"]);

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel: string, data?: unknown) => {
    if (!allowedChannels.has(channel)) {
      throw new Error(`IPC channel not allowed: ${channel}`);
    }

    return ipcRenderer.invoke(channel, data);
  },
  launchBrowser: (url: string, browserType: BrowserType) => {
    return ipcRenderer.invoke("browser:launch", { url, browserType });
  },
  readFormFields: () => {
    return ipcRenderer.invoke("browser:read-fields");
  },
  autofillForm: (profileFields: AutofillProfileField[]) => {
    return ipcRenderer.invoke("browser:autofill", profileFields);
  },
  sendPasswordOtp: (email: string) => {
    return ipcRenderer.invoke("auth:send-otp", email);
  },
  verifyPasswordOtp: (email: string, otp: string) => {
    return ipcRenderer.invoke("auth:verify-otp", { email, otp });
  },
});
