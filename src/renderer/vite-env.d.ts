export {};

declare global {
  type BrowserType = "chrome" | "edge";

  type BrowserLaunchResult =
    | {
        ok: true;
        url: string;
        browserType: BrowserType;
      }
    | {
        ok: false;
        error: string;
      };

  type DetectedField = {
    id: string;
    label: string;
    context?: string;
    type: string;
    required: boolean;
    placeholder?: string;
    name?: string;
    value?: string;
    options?: string[];
  };

  type ReadFieldsResult =
    | {
        ok: true;
        url: string;
        title: string;
        fields: DetectedField[];
      }
    | {
        ok: false;
      error: string;
    };

  type AutofillProfileField = {
    label: string;
    context?: string;
    value: string;
    aliases: string[];
  };

  type AutofillResult =
    | {
        ok: true;
        filledCount: number;
        skippedCount: number;
        results: Array<{
          label: string;
          value: string;
          status: "filled" | "skipped";
          reason?: string;
        }>;
      }
    | {
        ok: false;
        error: string;
      };

  type OtpResult =
    | { ok: true }
    | { ok: false; error: string };

  interface Window {
    electron: {
      invoke: (channel: string, data?: unknown) => Promise<unknown>;
      launchBrowser: (url: string, browserType: BrowserType) => Promise<BrowserLaunchResult>;
      readFormFields: () => Promise<ReadFieldsResult>;
      autofillForm: (profileFields: AutofillProfileField[]) => Promise<AutofillResult>;
      sendPasswordOtp: (email: string) => Promise<OtpResult>;
      verifyPasswordOtp: (email: string, otp: string) => Promise<OtpResult>;
    };
  }
}
