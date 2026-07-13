import { useMemo, useState } from "react";
import loginIllustration from "./assets/login.png";
import loginBackground from "./assets/back.png";
import mainBackground from "./assets/main.png";
import "./App.css";

type UserProfile = {
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  education: string;
  university: string;
  skills: string;
  experience: string;
  linkedin: string;
  github: string;
  portfolio: string;
  learnedFields: LearnedProfileField[];
};

type LearnedProfileField = {
  id: string;
  label: string;
  context?: string;
  category?: string;
  type: string;
  required: boolean;
  value: string;
  aliases: string[];
};

type BuiltInProfileKey = keyof Omit<UserProfile, "learnedFields">;

const emptyProfile: UserProfile = {
  fullName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  dob: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  education: "",
  university: "",
  skills: "",
  experience: "",
  linkedin: "",
  github: "",
  portfolio: "",
  learnedFields: [],
};

const profileFields: Array<{
  key: BuiltInProfileKey;
  label: string;
  type?: string;
  wide?: boolean;
}> = [
  { key: "fullName", label: "Full Name" },
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Mobile Number", type: "tel" },
  { key: "dob", label: "Date of Birth", type: "date" },
  { key: "gender", label: "Gender" },
  { key: "education", label: "Education" },
  { key: "university", label: "University" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills", wide: true },
  { key: "address", label: "Address", wide: true },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "postalCode", label: "Postal Code" },
  { key: "linkedin", label: "LinkedIn", type: "url" },
  { key: "github", label: "GitHub", type: "url" },
  { key: "portfolio", label: "Portfolio", type: "url", wide: true },
];

const profileStorageKey = "autoform-ai:user-profile";
const loginPasswordStorageKey = "autoform-ai:login-password";
const demoUsername = "Satyam02";
const initialDemoPassword = "Muskan!0202";

function loadLoginPassword() {
  return window.localStorage.getItem(loginPasswordStorageKey) || initialDemoPassword;
}

const builtInFieldAliases: Array<{
  key: BuiltInProfileKey;
  aliases: string[];
}> = [
  { key: "fullName", aliases: ["full name", "name", "candidate name", "applicant name"] },
  { key: "firstName", aliases: ["first name", "given name", "forename"] },
  { key: "middleName", aliases: ["middle name"] },
  { key: "lastName", aliases: ["last name", "surname", "family name"] },
  { key: "email", aliases: ["email", "email address", "mail"] },
  { key: "phone", aliases: ["phone", "mobile", "mobile number", "contact number"] },
  { key: "dob", aliases: ["date of birth", "dob", "birth date"] },
  { key: "gender", aliases: ["gender", "sex"] },
  { key: "address", aliases: ["address", "current address", "permanent address"] },
  { key: "city", aliases: ["city", "town"] },
  { key: "state", aliases: ["state", "province"] },
  { key: "country", aliases: ["country", "nationality"] },
  { key: "postalCode", aliases: ["postal code", "zip code", "pincode", "pin code"] },
  { key: "education", aliases: ["education", "degree", "qualification"] },
  { key: "university", aliases: ["university", "college", "institute"] },
  { key: "skills", aliases: ["skills", "technical skills"] },
  { key: "experience", aliases: ["experience", "work experience"] },
  { key: "linkedin", aliases: ["linkedin", "linkedin profile"] },
  { key: "github", aliases: ["github", "github profile"] },
  { key: "portfolio", aliases: ["portfolio", "website"] },
];

function loadSavedProfile() {
  const savedProfile = window.localStorage.getItem(profileStorageKey);

  if (!savedProfile) {
    return emptyProfile;
  }

  try {
    const parsedProfile = JSON.parse(savedProfile) as Partial<UserProfile>;
    return {
      ...emptyProfile,
      ...parsedProfile,
      learnedFields: Array.isArray(parsedProfile.learnedFields)
        ? parsedProfile.learnedFields
        : [],
    } as UserProfile;
  } catch {
    return emptyProfile;
  }
}

function saveProfileData(profileData: UserProfile) {
  window.localStorage.setItem(profileStorageKey, JSON.stringify(profileData));
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getEducationCategoryText(value: string) {
  const normalizedValue = normalizeLabel(value);

  if (/\b(highest qualification|highest qualification category)\b/.test(normalizedValue)) {
    return "Highest Qualification";
  }

  if (/\b(post graduation|postgraduate|post graduate|pg|master|mca|mba|m tech|mtech)\b/.test(normalizedValue)) {
    return "Post Graduation";
  }

  if (/\b(graduation|undergraduate|under graduate|ug|bachelor|b tech|btech|bca|bsc|ba|b com|bcom)\b/.test(normalizedValue)) {
    return "Graduation";
  }

  if (/\b(xii|12th|12 grade|class 12|higher secondary|intermediate|senior secondary)\b/.test(normalizedValue)) {
    return "XII Grade";
  }

  if (/\b(10th|10 grade|class 10|x grade|xth|secondary|matric|high school)\b/.test(normalizedValue)) {
    return "X Grade";
  }

  return "";
}

function getFieldCategory(field: DetectedField | LearnedProfileField) {
  const existingCategory = "category" in field ? field.category : "";
  return existingCategory || getEducationCategoryText(`${field.context ?? ""} ${field.label}`);
}

function isEducationScopedField(field: DetectedField | LearnedProfileField) {
  const category = getFieldCategory(field);
  const normalizedText = normalizeLabel(
    `${field.context ?? ""} ${field.label} ${"name" in field ? field.name ?? "" : ""}`,
  );

  return Boolean(
    category &&
      /\b(institute|university|college|school|board|course|degree|qualification|specialization|stream|branch|marks|percentage|cgpa|gpa|grade|passing|year|duration|start date|end date|roll|registration)\b/.test(
        normalizedText,
      ),
  );
}

function getLearnedFieldId(field: DetectedField) {
  const category = getFieldCategory(field);
  const contextKey = normalizeLabel(category || field.context || "general");
  return `${contextKey}:${normalizeLabel(field.label)}:${field.type}`;
}

function getDetectedFieldKey(field: DetectedField, index?: number) {
  return `${field.id}:${field.name ?? ""}:${field.label}:${field.type}:${index ?? ""}`;
}

function findBuiltInProfileKey(field: DetectedField) {
  if (isEducationScopedField(field)) {
    return undefined;
  }

  const normalizedLabel = normalizeLabel(field.label);

  return builtInFieldAliases.find(({ aliases }) =>
    aliases.some((alias) => {
      const normalizedAlias = normalizeLabel(alias);
      return (
        normalizedLabel === normalizedAlias ||
        normalizedLabel.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedLabel)
      );
    }),
  )?.key;
}

function isManualOnlyField(field: DetectedField | LearnedProfileField) {
  const normalizedLabel = normalizeLabel(field.label);
  const normalizedAliases =
    "aliases" in field ? field.aliases.map(normalizeLabel).join(" ") : "";

  return (
    field.type === "password" ||
    /\b(captcha|otp|verification code|security code|one time password)\b/.test(
      `${normalizedLabel} ${normalizedAliases}`,
    )
  );
}

function mergeDetectedFieldsIntoProfile(profileData: UserProfile, fields: DetectedField[]) {
  let learnedCount = 0;
  const learnedFields = [...profileData.learnedFields];

  fields.forEach((field) => {
    if (findBuiltInProfileKey(field) || isManualOnlyField(field)) {
      return;
    }

    const id = getLearnedFieldId(field);
    const existingField = learnedFields.find((learnedField) => learnedField.id === id);

    if (existingField) {
      existingField.aliases = Array.from(
        new Set([...existingField.aliases, field.label, field.name ?? ""].filter(Boolean)),
      );
      existingField.required = existingField.required || field.required;
      return;
    }

    learnedFields.push({
      id,
      label: field.label,
      context: field.context,
      category: getFieldCategory(field) || undefined,
      type: field.type,
      required: field.required,
      value: "",
      aliases: [field.label, field.name ?? ""].filter(Boolean),
    });
    learnedCount += 1;
  });

  return {
    learnedCount,
    profile: {
      ...profileData,
      learnedFields,
    },
  };
}

function VisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12s-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.7" />
      {visible ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

function App() {
  const [url, setUrl] = useState("");
  const [browserType, setBrowserType] = useState<BrowserType>("chrome");
  const [status, setStatus] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isReadingFields, setIsReadingFields] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [detectedFieldValues, setDetectedFieldValues] = useState<Record<string, string>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(loadSavedProfile);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMode, setLoginMode] = useState<"login" | "reset">("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginPasswordVisible, setIsLoginPasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(loadLoginPassword);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const profileInitial = useMemo(() => {
    return (
      profile.fullName.trim().charAt(0).toUpperCase() ||
      profile.firstName.trim().charAt(0).toUpperCase() ||
      "P"
    );
  }, [profile.firstName, profile.fullName]);

  const savedProfileFieldCount = useMemo(() => {
    const builtInCount = profileFields.filter((field) => profile[field.key].trim()).length;
    const learnedCount = profile.learnedFields.filter((field) => field.value.trim()).length;
    return builtInCount + learnedCount;
  }, [profile]);

  const launch = async () => {
    if (!url.trim()) {
      setStatus("Please enter a URL");
      return;
    }

    setIsLaunching(true);
    setStatus(`${browserType === "edge" ? "Edge" : "Chrome"} launching...`);

    try {
      const result = await window.electron.launchBrowser(url, browserType);

      if (!result?.ok) {
        setStatus(result?.error || "Browser launch failed");
        return;
      }

      setDetectedFields([]);
      setDetectedFieldValues({});
      setStatus(`Opened in ${result.browserType === "edge" ? "Edge" : "Chrome"}: ${result.url}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Browser launch failed");
    } finally {
      setIsLaunching(false);
    }
  };

  const readFields = async () => {
    setIsReadingFields(true);
    setStatus("Reading form fields from the current page...");

    try {
      const result = await window.electron.readFormFields();

      if (!result.ok) {
        setStatus(result.error);
        return;
      }

      setDetectedFields(result.fields);
      setDetectedFieldValues(
        Object.fromEntries(
          result.fields.map((field, index) => [
            getDetectedFieldKey(field, index),
            isManualOnlyField(field) ? "" : field.value ?? "",
          ]),
        ),
      );
      const trainedProfile = mergeDetectedFieldsIntoProfile(profile, result.fields);

      if (trainedProfile.learnedCount > 0) {
        setProfile(trainedProfile.profile);
        saveProfileData(trainedProfile.profile);
      }

      setStatus(
        `${result.fields.length} field${result.fields.length === 1 ? "" : "s"} detected from ${
          result.title || result.url
        }. ${trainedProfile.learnedCount} new field${
          trainedProfile.learnedCount === 1 ? "" : "s"
        } learned.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Form fields read failed");
    } finally {
      setIsReadingFields(false);
    }
  };

  const buildAutofillProfileFields = () => {
    const builtInAutofillFields: AutofillProfileField[] = profileFields
      .map((field) => {
        const aliases =
          builtInFieldAliases.find((aliasGroup) => aliasGroup.key === field.key)?.aliases ?? [];

        return {
          label: field.label,
          value: profile[field.key],
          aliases,
        };
      })
      .filter((field) => field.value.trim());

    const learnedAutofillFields: AutofillProfileField[] = profile.learnedFields
      .filter((field) => !isManualOnlyField(field))
      .map((field) => ({
        label: field.label,
        context: field.context,
        value: field.value,
        aliases: field.aliases,
      }))
      .filter((field) => field.value.trim());

    return [...builtInAutofillFields, ...learnedAutofillFields];
  };

  const autofillSavedValues = async () => {
    const autofillFields = buildAutofillProfileFields();

    if (autofillFields.length === 0) {
      setStatus("No saved values found. Train or save profile data first.");
      return;
    }

    setIsAutofilling(true);
    setStatus("Autofilling saved values into the current form...");
    saveProfileData(profile);

    try {
      const result = await window.electron.autofillForm(autofillFields);

      if (!result.ok) {
        setStatus(result.error);
        return;
      }

      setStatus(
        `Autofill complete. ${result.filledCount} field${
          result.filledCount === 1 ? "" : "s"
        } filled, ${result.skippedCount} skipped.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Autofill failed");
    } finally {
      setIsAutofilling(false);
    }
  };

  const updateProfileField = (key: BuiltInProfileKey, value: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [key]: value,
    }));
  };

  const updateLearnedFieldValue = (fieldId: string, value: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      learnedFields: currentProfile.learnedFields.map((field) =>
        field.id === fieldId ? { ...field, value } : field,
      ),
    }));
  };

  const updateDetectedFieldValue = (field: DetectedField, index: number, value: string) => {
    if (isManualOnlyField(field)) {
      return;
    }

    setDetectedFieldValues((currentValues) => ({
      ...currentValues,
      [getDetectedFieldKey(field, index)]: value,
    }));
  };

  const getDetectedFieldValue = (field: DetectedField, index: number) => {
    if (isManualOnlyField(field)) {
      return "";
    }

    return detectedFieldValues[getDetectedFieldKey(field, index)] ?? field.value ?? "";
  };

  const saveReadValues = () => {
    let savedCount = 0;

    const nextProfile = detectedFields.reduce<UserProfile>((currentProfile, field, index) => {
      if (isManualOnlyField(field)) {
        return currentProfile;
      }

      const value = getDetectedFieldValue(field, index).trim();

      if (!value) {
        return currentProfile;
      }

      savedCount += 1;
      const builtInKey = findBuiltInProfileKey(field);

      if (builtInKey) {
        return {
          ...currentProfile,
          [builtInKey]: value,
        };
      }

      const learnedFieldId = getLearnedFieldId(field);
      const existingField = currentProfile.learnedFields.find(
        (learnedField) => learnedField.id === learnedFieldId,
      );

      if (existingField) {
        return {
          ...currentProfile,
          learnedFields: currentProfile.learnedFields.map((learnedField) =>
            learnedField.id === learnedFieldId
              ? {
                  ...learnedField,
                  value,
                  context: learnedField.context || field.context,
                  category: learnedField.category || getFieldCategory(field) || undefined,
                  aliases: Array.from(
                    new Set([...learnedField.aliases, field.label, field.name ?? ""].filter(Boolean)),
                  ),
                }
              : learnedField,
          ),
        };
      }

      return {
        ...currentProfile,
        learnedFields: [
          ...currentProfile.learnedFields,
          {
            id: learnedFieldId,
            label: field.label,
            context: field.context,
            category: getFieldCategory(field) || undefined,
            type: field.type,
            required: field.required,
            value,
            aliases: [field.label, field.name ?? ""].filter(Boolean),
          },
        ],
      };
    }, profile);

    setProfile(nextProfile);
    saveProfileData(nextProfile);
    setStatus(
      savedCount
        ? `${savedCount} read value${savedCount === 1 ? "" : "s"} saved for future autofill.`
        : "No filled values found to save.",
    );
  };

  const saveProfile = () => {
    saveProfileData(profile);
    setStatus("Profile saved. Autofill data is ready.");
    setIsProfileOpen(false);
  };

  const login = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("Please enter your username and password.");
      return;
    }

    if (loginUsername !== demoUsername || loginPassword !== currentPassword) {
      setLoginError("Incorrect username or password.");
      return;
    }

    setLoginError("");
    setIsLoggedIn(true);
  };

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loginUsername !== demoUsername) {
      setLoginError("Enter the registered username to reset the password.");
      return;
    }

    if (!isOtpSent) {
      if (!recoveryEmail.trim()) {
        setLoginError("Enter your recovery email address.");
        return;
      }

      setIsSendingOtp(true);
      setLoginError("");
      const result = await window.electron.sendPasswordOtp(recoveryEmail);
      setIsSendingOtp(false);

      if (!result.ok) {
        setLoginError(result.error);
        return;
      }

      setIsOtpSent(true);
      setResetMessage("OTP sent. Check your Gmail inbox and Spam folder.");
      return;
    }

    if (newPassword.length < 6) {
      setLoginError("New password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoginError("New password and confirmation do not match.");
      return;
    }

    if (!otpCode.trim()) {
      setLoginError("Enter the 6-digit OTP sent to your email.");
      return;
    }

    setIsVerifyingOtp(true);
    setLoginError("");
    const result = await window.electron.verifyPasswordOtp(recoveryEmail, otpCode);
    setIsVerifyingOtp(false);

    if (!result.ok) {
      setLoginError(result.error);
      return;
    }

    setCurrentPassword(newPassword);
    window.localStorage.setItem(loginPasswordStorageKey, newPassword);
    setLoginPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpCode("");
    setIsOtpSent(false);
    setLoginError("");
    setResetMessage("Password updated. Please login with your new password.");
    setLoginMode("login");
  };

  const openResetPassword = () => {
    setLoginError("");
    setResetMessage("");
    setLoginPassword("");
    setRecoveryEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setIsOtpSent(false);
    setLoginMode("reset");
  };

  const openLogin = () => {
    setLoginError("");
    setLoginMode("login");
  };

  if (!isLoggedIn) {
    return (
      <main
        className="login-page"
        style={{ backgroundImage: `linear-gradient(rgb(4 41 34 / 58%), rgb(4 41 34 / 58%)), url(${loginBackground})` }}
      >
        <section className="login-card" aria-labelledby="login-heading">
          <div className="login-illustration-panel">
            <img src={loginIllustration} alt="Person walking" />
            <p>Smart and simple form filling</p>
          </div>

          <form className="login-form" onSubmit={loginMode === "login" ? login : resetPassword}>
            <span className="login-brand">AUTOFORM AI</span>
            <h1 id="login-heading">{loginMode === "login" ? "Welcome back" : "Reset password"}</h1>
            <p>
              {loginMode === "login"
                ? "Login to continue to your autofill workspace."
                : "Enter your username and choose a new password."}
            </p>

            <label>
              <span>Username</span>
              <input
                type="text"
                placeholder="Enter your username"
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
                autoComplete="username"
              />
            </label>

            {loginMode === "reset" ? (
              <label>
                <span>Recovery email</span>
                <input
                  type="email"
                  placeholder="Enter email to receive OTP"
                  value={recoveryEmail}
                  onChange={(event) => setRecoveryEmail(event.target.value)}
                  disabled={isOtpSent}
                />
              </label>
            ) : null}

            {loginMode === "login" ? (
              <label>
                <span>Password</span>
                <span className="password-input">
                  <input
                    type={isLoginPasswordVisible ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={isLoginPasswordVisible ? "Hide password" : "Show password"}
                    title={isLoginPasswordVisible ? "Hide password" : "Show password"}
                    onClick={() => setIsLoginPasswordVisible((visible) => !visible)}
                  >
                    <VisibilityIcon visible={isLoginPasswordVisible} />
                  </button>
                </span>
              </label>
            ) : isOtpSent ? (
              <>
                <label>
                  <span>6-digit OTP</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter OTP from email"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <label>
                  <span>New password</span>
                  <span className="password-input">
                    <input
                      type={isNewPasswordVisible ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={isNewPasswordVisible ? "Hide password" : "Show password"}
                      title={isNewPasswordVisible ? "Hide password" : "Show password"}
                      onClick={() => setIsNewPasswordVisible((visible) => !visible)}
                    >
                      <VisibilityIcon visible={isNewPasswordVisible} />
                    </button>
                  </span>
                </label>

                <label>
                  <span>Confirm new password</span>
                  <span className="password-input">
                    <input
                      type={isConfirmPasswordVisible ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={isConfirmPasswordVisible ? "Hide password" : "Show password"}
                      title={isConfirmPasswordVisible ? "Hide password" : "Show password"}
                      onClick={() => setIsConfirmPasswordVisible((visible) => !visible)}
                    >
                      <VisibilityIcon visible={isConfirmPasswordVisible} />
                    </button>
                  </span>
                </label>
              </>
            ) : null}

            {loginError ? <p className="login-error">{loginError}</p> : null}
            {resetMessage ? <p className="login-success">{resetMessage}</p> : null}
            <button type="submit" disabled={isSendingOtp || isVerifyingOtp}>
              {loginMode === "login"
                ? "Login"
                : isOtpSent
                  ? isVerifyingOtp ? "Verifying OTP..." : "Verify OTP & update password"
                  : isSendingOtp ? "Sending OTP..." : "Send OTP"}
            </button>
            <button
              className="login-link"
              type="button"
              onClick={loginMode === "login" ? openResetPassword : openLogin}
            >
              {loginMode === "login" ? "Forgot password?" : "Back to login"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!window.electron) {
    return (
      <div className="app-shell">
        <main className="desktop-only-screen">
          <section className="desktop-only-panel">
            <h1>AutoForm AI</h1>
            <p>This project runs only inside the Electron desktop app.</p>
            <span>Start it with npm.cmd run dev and use the Electron window.</span>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div
      className="app-shell app-dashboard"
      style={{
        backgroundImage: `linear-gradient(180deg, rgb(10 19 28 / 26%), rgb(8 18 25 / 58%)), url(${mainBackground})`,
      }}
    >
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-orb">A</span>
          <div>
            <h1>AutoForm AI</h1>
            <p>Desktop form assistant</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="saved-fields">{savedProfileFieldCount} fields saved</span>
          <button
            className="profile-button"
            title="Open saved profile data"
            type="button"
            onClick={() => setIsProfileOpen(true)}
          >
            {profileInitial}
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="hero-copy">
          <span className="eyebrow">AUTOFORM AI / DESKTOP</span>
          <h2>Discover forms without the busywork.</h2>
          <p>Scan any form, save its fields, and autofill with a profile that is ready when you are.</p>
        </section>

        <section className="control-panel">
          <input
            type="text"
            placeholder="https://docs.google.com/forms/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void launch();
              }
            }}
          />

          <div className="browser-switch" aria-label="Choose browser">
            <button
              className={browserType === "chrome" ? "browser-option browser-option-active" : "browser-option"}
              type="button"
              onClick={() => setBrowserType("chrome")}
            >
              Chrome
            </button>
            <button
              className={browserType === "edge" ? "browser-option browser-option-active" : "browser-option"}
              type="button"
              onClick={() => setBrowserType("edge")}
            >
              Edge
            </button>
          </div>

          <button onClick={launch} disabled={isLaunching}>
            {isLaunching ? "Launching..." : `Open ${browserType === "edge" ? "Edge" : "Chrome"}`}
          </button>

          <button onClick={readFields} disabled={isReadingFields}>
            {isReadingFields ? "Reading..." : "Read Fields"}
          </button>

          <button onClick={autofillSavedValues} disabled={isAutofilling}>
            {isAutofilling ? "Autofilling..." : "Autofill Saved Values"}
          </button>
        </section>

        {status ? (
          <p
            className={
              status.startsWith("Opened") ||
              status.includes("detected") ||
              status.includes("saved for future autofill") ||
              status.startsWith("Profile saved") ||
              status.startsWith("Autofill complete")
                ? "status status-success"
                : "status status-error"
            }
          >
            {status}
          </p>
        ) : null}

      {detectedFields.length > 0 ? (
        <section className="fields-panel">
          <div className="fields-panel-header">
            <h2>Detected Form Fields</h2>
            <button type="button" onClick={saveReadValues}>
              Save Read Values
            </button>
          </div>
          <div className="field-list">
            {detectedFields.map((field, index) => (
              <article className="field-card" key={`${field.id}-${index}`}>
                <div className="field-card-header">
                  <strong>{field.label}</strong>
                  <span
                    className={
                      isManualOnlyField(field)
                        ? "manual-chip"
                        : field.required
                          ? "required-chip"
                          : "optional-chip"
                    }
                  >
                    {isManualOnlyField(field) ? "Manual" : field.required ? "Required" : "Optional"}
                  </span>
                </div>
                <p>
                  Type: {field.type}
                  {getFieldCategory(field) ? ` | Category: ${getFieldCategory(field)}` : ""}
                  {field.context ? ` | Context: ${field.context}` : ""}
                  {field.name ? ` | Name: ${field.name}` : ""}
                  {field.placeholder ? ` | Placeholder: ${field.placeholder}` : ""}
                </p>
                {field.options?.length ? (
                  <p className="field-options">Options: {field.options.join(", ")}</p>
                ) : null}
                <label className="training-field">
                  <span>{isManualOnlyField(field) ? "Manual entry only" : "Training value"}</span>
                  <input
                    type="text"
                    value={getDetectedFieldValue(field, index)}
                    placeholder={
                      isManualOnlyField(field)
                        ? "Fill this directly on the website"
                        : field.type === "file"
                          ? "File path will be supported next"
                          : "Enter value"
                    }
                    disabled={isManualOnlyField(field)}
                    onChange={(event) => updateDetectedFieldValue(field, index, event.target.value)}
                  />
                </label>
              </article>
            ))}
          </div>
        </section>
      ) : null}

        {!detectedFields.length ? (
          <section className="empty-state">
            <h2>Save profile data first, then scan a form</h2>
            <p>
              Next, the saved profile will be matched with detected fields to start autofill.
            </p>
          </section>
        ) : null}
      </main>

      {isProfileOpen ? (
        <div className="profile-overlay" role="dialog" aria-modal="true">
          <aside className="profile-drawer">
            <div className="profile-drawer-header">
              <div>
                <h2>User Profile</h2>
                <p>Reusable data for autofill</p>
              </div>
              <button
                className="icon-button"
                title="Close profile"
                type="button"
                onClick={() => setIsProfileOpen(false)}
              >
                X
              </button>
            </div>

            <div className="profile-form">
              {profileFields.map((field) => (
                <label className={field.wide ? "profile-field profile-field-wide" : "profile-field"} key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type={field.type ?? "text"}
                    value={profile[field.key]}
                    onChange={(event) => updateProfileField(field.key, event.target.value)}
                  />
                </label>
              ))}
            </div>

            {profile.learnedFields.length > 0 ? (
              <section className="learned-fields-section">
                <h3>Learned Form Fields</h3>
                <p>New fields discovered from scanned forms are stored here for future autofill.</p>
                <div className="profile-form">
                  {profile.learnedFields.map((field) => (
                    <label className="profile-field profile-field-wide" key={field.id}>
                      <span>
                        {field.category ? `${field.category} - ` : ""}
                        {field.label} {field.required ? "(Required)" : "(Optional)"}
                      </span>
                      <input
                        type="text"
                        value={field.value}
                        placeholder={`Type: ${field.type}`}
                        onChange={(event) => updateLearnedFieldValue(field.id, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="profile-actions">
              <button type="button" onClick={() => setProfile(emptyProfile)}>
                Clear
              </button>
              <button type="button" onClick={saveProfile}>
                Save Profile
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default App;
