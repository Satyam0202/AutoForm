import { ipcMain } from "electron";
import { autofillForm, launchBrowser, readFormFields } from "../automation/browser";
import type { AutofillProfileField, BrowserType } from "../automation/browser";
import { sendPasswordOtp, verifyPasswordOtp } from "../otpService";

type BrowserLaunchRequest = {
  url: string;
  browserType?: BrowserType;
};

export function registerBrowserIPC() {
  ipcMain.handle("auth:send-otp", async (_event, email: string) => {
    try {
      await sendPasswordOtp(email);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not send OTP." };
    }
  });

  ipcMain.handle("auth:verify-otp", async (_event, request: { email: string; otp: string }) => {
    try {
      verifyPasswordOtp(request.email, request.otp);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not verify OTP." };
    }
  });

  ipcMain.handle("browser:launch", async (_event, request: BrowserLaunchRequest) => {
    try {
      return await launchBrowser(request.url, request.browserType ?? "chrome");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Browser launch failed";

      return { ok: false, error: message };
    }
  });

  ipcMain.handle("browser:read-fields", async () => {
    try {
      return await readFormFields();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Form fields read failed";

      return { ok: false, error: message };
    }
  });

  ipcMain.handle("browser:autofill", async (_event, profileFields: AutofillProfileField[]) => {
    try {
      return await autofillForm(profileFields);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Autofill failed";

      return { ok: false, error: message };
    }
  });
}
