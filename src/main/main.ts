import { app, BrowserWindow, Menu } from "electron";
import { registerBrowserIPC } from "./ipc/browser";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {}

let mainWindow: BrowserWindow | null = null;
const rendererUrl = "http://localhost:5173";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    title: "AutoForm AI",
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Development uses Vite only as Electron's internal renderer server.
  // No browser tab is opened; production loads the local built UI instead.
  if (app.isPackaged) {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    void mainWindow.loadURL(rendererUrl);
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== rendererUrl) {
      event.preventDefault();
    }
  });

  // Windows can retain the default menu bar for an existing app process.
  // Remove it from this window as well as from the application globally.
  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerBrowserIPC();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
