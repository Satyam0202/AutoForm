// src/main/main.ts
import { app as app2, BrowserWindow, Menu } from "electron";

// src/main/ipc/browser.ts
import { ipcMain } from "electron";

// src/main/automation/browser.ts
import { app } from "electron";
import { existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
var browserConfigs = {
  chrome: {
    displayName: "Google Chrome",
    debugPort: 9222,
    profileDirectoryName: "chrome-profile",
    executableCandidates: () => [
      process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe") : "",
      process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe") : "",
      process.env.LocalAppData ? path.join(process.env.LocalAppData, "Google", "Chrome", "Application", "chrome.exe") : ""
    ]
  },
  edge: {
    displayName: "Microsoft Edge",
    debugPort: 9223,
    profileDirectoryName: "edge-profile",
    executableCandidates: () => [
      process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe") : "",
      process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe") : "",
      process.env.LocalAppData ? path.join(process.env.LocalAppData, "Microsoft", "Edge", "Application", "msedge.exe") : ""
    ]
  }
};
var browser = null;
var browserContext = null;
var page = null;
var activeBrowserType = null;
async function launchBrowser(url, browserType = "chrome") {
  const targetUrl = normalizeUrl(url);
  const browserConfig = browserConfigs[browserType];
  if (activeBrowserType !== browserType && browser?.isConnected()) {
    await browser.close();
  }
  if (!browser || !browser.isConnected() || activeBrowserType !== browserType) {
    await launchBrowserForDebugging(browserType);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${browserConfig.debugPort}`);
    browserContext = browser.contexts()[0] ?? null;
    activeBrowserType = browserType;
    browser.on("disconnected", () => {
      browser = null;
      browserContext = null;
      page = null;
      activeBrowserType = null;
    });
  }
  if (!browserContext) {
    throw new Error(`Could not connect to the ${browserConfig.displayName} browser context`);
  }
  if (!page || page.isClosed()) {
    page = await browserContext.newPage();
  }
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  return { ok: true, url: targetUrl, browserType };
}
async function readFormFields() {
  const activePage = getActivePage();
  const fields = await activePage.evaluate(() => {
    const cleanText = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    const unique = (values) => Array.from(new Set(values.map(cleanText).filter(Boolean)));
    const getChoiceGroupLabel = (group, options) => {
      const text = cleanText(group.textContent);
      const labelText = options.reduce(
        (currentText, option) => cleanText(currentText.replace(new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ")),
        text
      );
      return cleanText(
        group.querySelector("label, legend, [role='heading'], h1, h2, h3, h4, h5, h6")?.textContent
      ) || cleanText(labelText.replace(/\*/g, "")) || "Choice";
    };
    const getFieldContext = (element) => {
      const container = element.closest("section, fieldset, form, [role='region'], .Qr7Oae, .geS5n") || document.body;
      const sectionHeading = cleanText(
        container.querySelector("h1, h2, h3, legend, [role='heading']")?.textContent
      );
      const allHeadings = Array.from(document.querySelectorAll("h1, h2, h3, [role='heading']")).map((heading) => ({
        text: cleanText(heading.textContent),
        top: heading.getBoundingClientRect().top
      })).filter((heading) => heading.text && heading.top <= element.getBoundingClientRect().top);
      const nearestHeading = allHeadings.at(-1)?.text ?? "";
      return nearestHeading || sectionHeading || void 0;
    };
    const getLabelText = (element) => {
      const id = element.getAttribute("id");
      const ariaLabel = cleanText(element.getAttribute("aria-label"));
      const ariaLabelledBy = element.getAttribute("aria-labelledby");
      const explicitLabel = id ? cleanText(document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent) : "";
      const wrappingLabel = cleanText(element.closest("label")?.textContent);
      const labelledByText = ariaLabelledBy ? cleanText(
        ariaLabelledBy.split(/\s+/).map((labelId) => document.getElementById(labelId)?.textContent ?? "").join(" ")
      ) : "";
      const googleQuestion = element.closest("[role='listitem'], .Qr7Oae, .geS5n");
      const googleTitle = googleQuestion ? cleanText(
        googleQuestion.querySelector("[role='heading'], .M7eMe, .HoXoMd, .AgroKb")?.textContent
      ) : "";
      const nearbyText = cleanText(
        element.closest("div, section, fieldset, form")?.querySelector("label, legend, [role='heading']")?.textContent
      );
      return googleTitle || explicitLabel || wrappingLabel || labelledByText || ariaLabel || nearbyText || cleanText(element.getAttribute("name")) || cleanText(element.getAttribute("placeholder")) || "Unlabelled field";
    };
    const isRequired = (element) => {
      const question = element.closest("[role='listitem'], .Qr7Oae, .geS5n");
      const requiredText = `${element.getAttribute("aria-label") ?? ""} ${question?.textContent ?? ""}`;
      return element.hasAttribute("required") || element.getAttribute("aria-required") === "true" || /\*\s*$|required|indicates required question/i.test(requiredText);
    };
    const getElementValue = (element) => {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        return cleanText(element.value);
      }
      if (element instanceof HTMLElement) {
        return cleanText(
          element.getAttribute("aria-valuetext") || element.getAttribute("aria-label") || element.innerText || element.textContent
        );
      }
      return "";
    };
    const makeField = (element, index, fallbackType) => {
      const input = element;
      const tagName = element.tagName.toLowerCase();
      const type = input instanceof HTMLInputElement ? input.type || fallbackType : element.getAttribute("role") || tagName || fallbackType;
      return {
        id: element.getAttribute("id") || element.getAttribute("name") || `field-${index + 1}`,
        label: getLabelText(element),
        context: getFieldContext(element),
        type,
        required: isRequired(element),
        placeholder: cleanText(input.getAttribute("placeholder")),
        name: cleanText(input.getAttribute("name")),
        value: getElementValue(element),
        options: input instanceof HTMLSelectElement ? unique(Array.from(input.options).map((option) => option.textContent ?? "")) : void 0
      };
    };
    const fields2 = [];
    const seen = /* @__PURE__ */ new Set();
    const seenGoogleQuestions = /* @__PURE__ */ new Set();
    const selectors = [
      "input:not([type='hidden'])",
      "textarea",
      "select",
      "[contenteditable='true']",
      "[role='textbox']",
      "[role='combobox']"
    ];
    document.querySelectorAll(selectors.join(",")).forEach((element, index) => {
      if (seen.has(element)) {
        return;
      }
      seen.add(element);
      fields2.push(makeField(element, index, "text"));
    });
    document.querySelectorAll("[role='listitem'], .Qr7Oae").forEach((question, index) => {
      if (seenGoogleQuestions.has(question)) {
        return;
      }
      seenGoogleQuestions.add(question);
      const questionText = cleanText(question.textContent);
      const label = cleanText(
        question.querySelector("[role='heading'], .M7eMe, .HoXoMd, .AgroKb")?.textContent
      );
      const hasFileUpload = question.querySelector("input[type='file']") || /\badd file\b|\bupload\s+\d*\s*supported file\b|supported file:|max\s+\d+\s*mb/i.test(
        questionText
      );
      if (!hasFileUpload || !label) {
        return;
      }
      const fileHint = cleanText(
        questionText.replace(label, "").replace(/Add File/gi, "").replace(/\*/g, "")
      );
      fields2.push({
        id: question.getAttribute("id") || `file-upload-${index + 1}`,
        label,
        context: getFieldContext(question),
        type: "file",
        required: isRequired(question),
        placeholder: fileHint || void 0
      });
    });
    const optionGroups = document.querySelectorAll("[role='radiogroup'], [role='group']");
    optionGroups.forEach((group, index) => {
      const options = unique(
        Array.from(group.querySelectorAll("[role='radio'], [role='checkbox'], label")).map(
          (option) => option.textContent ?? option.getAttribute("aria-label") ?? ""
        )
      );
      if (options.length === 0) {
        return;
      }
      fields2.push({
        id: group.getAttribute("id") || `option-group-${index + 1}`,
        label: getLabelText(group),
        context: getFieldContext(group),
        type: group.getAttribute("role") === "radiogroup" ? "radio" : "choice",
        required: isRequired(group),
        options
      });
    });
    const seenChoiceLabels = /* @__PURE__ */ new Set();
    document.querySelectorAll("section, fieldset, article, div").forEach((group, index) => {
      if (group === document.body) {
        return;
      }
      const optionElements = Array.from(
        group.querySelectorAll("button:not([disabled]), [role='button']:not([aria-disabled='true'])")
      ).filter((option) => {
        const text = cleanText(option.textContent || option.getAttribute("aria-label"));
        const rect = option.getBoundingClientRect();
        return text && text.length <= 40 && rect.width > 0 && rect.height > 0;
      });
      const options = unique(optionElements.map((option) => option.textContent || option.getAttribute("aria-label") || ""));
      if (options.length < 2 || options.length > 8) {
        return;
      }
      const label = getChoiceGroupLabel(group, options);
      const normalizedLabelKey = `${label}:${getFieldContext(group) ?? ""}:${options.join("|")}`;
      if (seenChoiceLabels.has(normalizedLabelKey)) {
        return;
      }
      seenChoiceLabels.add(normalizedLabelKey);
      fields2.push({
        id: group.getAttribute("id") || `button-choice-${index + 1}`,
        label,
        context: getFieldContext(group),
        type: "choice",
        required: isRequired(group),
        options
      });
    });
    return fields2.filter(
      (field, index, allFields) => allFields.findIndex(
        (candidate) => candidate.label === field.label && candidate.context === field.context && candidate.type === field.type && candidate.name === field.name
      ) === index
    );
  });
  return {
    ok: true,
    url: activePage.url(),
    title: await activePage.title(),
    fields
  };
}
async function autofillForm(profileFields) {
  const activePage = getActivePage();
  const fieldsToFill = profileFields.map((field) => ({
    ...field,
    value: field.value.trim(),
    aliases: [field.label, ...field.aliases].filter(Boolean)
  })).filter((field) => field.value);
  const result = await activePage.evaluate((fields) => {
    const cleanText = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    const normalize = (value) => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const getEducationContext = (value) => {
      const normalizedValue = normalize(value);
      if (/\b(highest qualification|highest qualification category)\b/.test(normalizedValue)) {
        return "highest-qualification";
      }
      if (/\b(post graduation|postgraduate|post graduate|pg|master|mca|mba|m tech|mtech)\b/.test(normalizedValue)) {
        return "post-graduation";
      }
      if (/\b(graduation|undergraduate|under graduate|ug|bachelor|b tech|btech|bca|bsc|ba|b com|bcom)\b/.test(normalizedValue)) {
        return "graduation";
      }
      if (/\b(xii|12th|12 grade|class 12|higher secondary|intermediate|senior secondary)\b/.test(normalizedValue)) {
        return "class-12";
      }
      if (/\b(10th|10 grade|class 10|x grade|xth|secondary|matric|high school)\b/.test(normalizedValue)) {
        return "class-10";
      }
      return "";
    };
    const isEducationScopedLabel = (value) => /\b(institute|university|college|school|board|course|degree|qualification|specialization|stream|branch|marks|percentage|cgpa|gpa|grade|passing|year|duration|start date|end date|roll|registration)\b/.test(
      normalize(value)
    );
    const scoreMatch = (label, context, field) => {
      const normalizedLabel = normalize(label);
      const normalizedContext = normalize(context ?? "");
      const normalizedFieldContext = normalize(field.context ?? "");
      const targetEducationContext = getEducationContext(`${context ?? ""} ${label}`);
      const fieldEducationContext = getEducationContext(`${field.context ?? ""} ${field.label}`);
      const aliases = field.aliases.map(normalize).filter(Boolean);
      if (!normalizedLabel || aliases.length === 0) {
        return 0;
      }
      if (targetEducationContext && fieldEducationContext && targetEducationContext !== fieldEducationContext) {
        return 0;
      }
      if (targetEducationContext && isEducationScopedLabel(`${context ?? ""} ${label}`) && !fieldEducationContext) {
        return 0;
      }
      if (aliases.some((alias) => alias === normalizedLabel)) {
        return normalizedContext && normalizedContext === normalizedFieldContext ? 115 : 100;
      }
      if (aliases.some((alias) => normalizedLabel.includes(alias) || alias.includes(normalizedLabel))) {
        return normalizedContext && normalizedContext === normalizedFieldContext ? 90 : 75;
      }
      const labelTokens = new Set(normalizedLabel.split(" ").filter(Boolean));
      const bestOverlap = Math.max(
        0,
        ...aliases.map((alias) => {
          const aliasTokens = alias.split(" ").filter(Boolean);
          const overlap = aliasTokens.filter((token) => labelTokens.has(token)).length;
          return aliasTokens.length ? Math.round(overlap / aliasTokens.length * 50) : 0;
        })
      );
      return normalizedContext && normalizedContext === normalizedFieldContext ? bestOverlap + 15 : bestOverlap;
    };
    const getFieldContext = (element) => {
      const container = element.closest("section, fieldset, form, [role='region'], .Qr7Oae, .geS5n") || document.body;
      const sectionHeading = cleanText(
        container.querySelector("h1, h2, h3, legend, [role='heading']")?.textContent
      );
      const allHeadings = Array.from(document.querySelectorAll("h1, h2, h3, [role='heading']")).map((heading) => ({
        text: cleanText(heading.textContent),
        top: heading.getBoundingClientRect().top
      })).filter((heading) => heading.text && heading.top <= element.getBoundingClientRect().top);
      const nearestHeading = allHeadings.at(-1)?.text ?? "";
      return nearestHeading || sectionHeading || void 0;
    };
    const getLabelText = (element) => {
      const id = element.getAttribute("id");
      const ariaLabel = cleanText(element.getAttribute("aria-label"));
      const ariaLabelledBy = element.getAttribute("aria-labelledby");
      const explicitLabel = id ? cleanText(document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent) : "";
      const wrappingLabel = cleanText(element.closest("label")?.textContent);
      const labelledByText = ariaLabelledBy ? cleanText(
        ariaLabelledBy.split(/\s+/).map((labelId) => document.getElementById(labelId)?.textContent ?? "").join(" ")
      ) : "";
      const googleQuestion = element.closest("[role='listitem'], .Qr7Oae, .geS5n");
      const googleTitle = googleQuestion ? cleanText(
        googleQuestion.querySelector("[role='heading'], .M7eMe, .HoXoMd, .AgroKb")?.textContent
      ) : "";
      return googleTitle || explicitLabel || wrappingLabel || labelledByText || ariaLabel || cleanText(element.getAttribute("name")) || cleanText(element.getAttribute("placeholder")) || "Unlabelled field";
    };
    const unique = (values) => Array.from(new Set(values.map(cleanText).filter(Boolean)));
    const getChoiceGroupLabel = (group, options) => {
      const text = cleanText(group.textContent);
      const labelText = options.reduce(
        (currentText, option) => cleanText(currentText.replace(new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ")),
        text
      );
      return cleanText(
        group.querySelector("label, legend, [role='heading'], h1, h2, h3, h4, h5, h6")?.textContent
      ) || cleanText(labelText.replace(/\*/g, "")) || "Choice";
    };
    const findBestField = (label, context) => {
      let bestField = null;
      let bestScore = 0;
      for (const field of fields) {
        const score = scoreMatch(label, context, field);
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
      return bestField && bestScore >= 45 ? bestField : null;
    };
    const dispatchFormEvents = (element) => {
      element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
      element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    };
    const setNativeValue = (element, value) => {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      valueSetter?.call(element, value);
      dispatchFormEvents(element);
      element.blur();
    };
    const clickChoiceOption = (option) => {
      if (!(option instanceof HTMLElement)) {
        return false;
      }
      option.scrollIntoView({ block: "center", inline: "center" });
      option.focus();
      option.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      option.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      option.click();
      option.dispatchEvent(new Event("change", { bubbles: true }));
      option.blur();
      return true;
    };
    const formatValueForInput = (element, value) => {
      if (element.type !== "date") {
        return value;
      }
      const normalizedValue = value.trim();
      const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        return normalizedValue;
      }
      const dateParts = normalizedValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (!dateParts) {
        return value;
      }
      const [, day, month, year] = dateParts;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    };
    const findMatchingChoiceOption = (group, targetValue) => {
      const normalizedTargetValue = normalize(targetValue);
      return Array.from(
        group.querySelectorAll("[role='radio'], [role='checkbox'], label, button:not([disabled]), [role='button']:not([aria-disabled='true'])")
      ).find((candidate) => {
        const optionText = normalize(candidate.textContent ?? candidate.getAttribute("aria-label") ?? "");
        return optionText && (optionText === normalizedTargetValue || optionText.includes(normalizedTargetValue) || normalizedTargetValue.includes(optionText));
      });
    };
    const fillResults = [];
    const usedElements = /* @__PURE__ */ new Set();
    document.querySelectorAll(
      "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable='true'], [role='textbox'], [role='combobox']"
    ).forEach((element) => {
      if (usedElements.has(element)) {
        return;
      }
      const label = getLabelText(element);
      const context = getFieldContext(element);
      const matchedField = findBestField(label, context);
      if (!matchedField) {
        return;
      }
      usedElements.add(element);
      if (element instanceof HTMLInputElement) {
        if (["radio", "checkbox", "file", "button", "submit"].includes(element.type)) {
          fillResults.push({ label, value: matchedField.value, status: "skipped", reason: `Unsupported input type: ${element.type}` });
          return;
        }
        element.focus();
        setNativeValue(element, formatValueForInput(element, matchedField.value));
        fillResults.push({ label, value: matchedField.value, status: "filled" });
        return;
      }
      if (element instanceof HTMLTextAreaElement) {
        element.focus();
        setNativeValue(element, matchedField.value);
        fillResults.push({ label, value: matchedField.value, status: "filled" });
        return;
      }
      if (element instanceof HTMLSelectElement) {
        const option = Array.from(element.options).find((candidate) => {
          const optionText = normalize(candidate.textContent ?? "");
          const optionValue = normalize(candidate.value);
          const targetValue = normalize(matchedField.value);
          return optionText === targetValue || optionValue === targetValue || optionText.includes(targetValue);
        });
        if (!option) {
          fillResults.push({ label, value: matchedField.value, status: "skipped", reason: "No matching option" });
          return;
        }
        element.value = option.value;
        dispatchFormEvents(element);
        fillResults.push({ label, value: matchedField.value, status: "filled" });
        return;
      }
      if (element instanceof HTMLElement) {
        element.focus();
        element.textContent = matchedField.value;
        element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: matchedField.value }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        fillResults.push({ label, value: matchedField.value, status: "filled" });
      }
    });
    document.querySelectorAll("[role='radiogroup'], [role='group']").forEach((group) => {
      const label = getLabelText(group);
      const context = getFieldContext(group);
      const matchedField = findBestField(label, context);
      if (!matchedField) {
        return;
      }
      const option = findMatchingChoiceOption(group, matchedField.value);
      if (!option) {
        fillResults.push({ label, value: matchedField.value, status: "skipped", reason: "No matching choice" });
        return;
      }
      if (clickChoiceOption(option)) {
        fillResults.push({ label, value: matchedField.value, status: "filled" });
      }
    });
    const usedChoiceLabels = /* @__PURE__ */ new Set();
    document.querySelectorAll("section, fieldset, article, div").forEach((group) => {
      const optionElements = Array.from(
        group.querySelectorAll("button:not([disabled]), [role='button']:not([aria-disabled='true'])")
      ).filter((option2) => {
        const text = cleanText(option2.textContent || option2.getAttribute("aria-label"));
        const rect = option2.getBoundingClientRect();
        return text && text.length <= 40 && rect.width > 0 && rect.height > 0;
      });
      const options = unique(optionElements.map((option2) => option2.textContent || option2.getAttribute("aria-label") || ""));
      if (options.length < 2 || options.length > 8) {
        return;
      }
      const label = getChoiceGroupLabel(group, options);
      const context = getFieldContext(group);
      const choiceKey = `${label}:${context ?? ""}:${options.join("|")}`;
      if (usedChoiceLabels.has(choiceKey)) {
        return;
      }
      usedChoiceLabels.add(choiceKey);
      const matchedField = findBestField(label, context);
      if (!matchedField) {
        return;
      }
      const option = findMatchingChoiceOption(group, matchedField.value);
      if (!option) {
        fillResults.push({ label, value: matchedField.value, status: "skipped", reason: "No matching button choice" });
        return;
      }
      if (clickChoiceOption(option)) {
        fillResults.push({ label, value: matchedField.value, status: "filled" });
      }
    });
    return {
      filledCount: fillResults.filter((item) => item.status === "filled").length,
      skippedCount: fillResults.filter((item) => item.status === "skipped").length,
      results: fillResults
    };
  }, fieldsToFill);
  return {
    ok: true,
    ...result
  };
}
function getActivePage() {
  if (!page || page.isClosed()) {
    throw new Error("Launch a form URL in the browser first");
  }
  return page;
}
function getBrowserProfilePath(browserType) {
  return path.join(app.getPath("userData"), browserConfigs[browserType].profileDirectoryName);
}
async function launchBrowserForDebugging(browserType) {
  const browserConfig = browserConfigs[browserType];
  if (await isBrowserDebuggingReady(browserConfig.debugPort)) {
    return;
  }
  const browserPath = getBrowserExecutablePath(browserType);
  const browserProfilePath = getBrowserProfilePath(browserType);
  const browserProcess = spawn(
    browserPath,
    [
      `--remote-debugging-port=${browserConfig.debugPort}`,
      `--user-data-dir=${browserProfilePath}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank"
    ],
    {
      detached: true,
      stdio: "ignore"
    }
  );
  browserProcess.unref();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isBrowserDebuggingReady(browserConfig.debugPort)) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
  throw new Error(`Could not start ${browserConfig.displayName}`);
}
function getBrowserExecutablePath(browserType) {
  const browserConfig = browserConfigs[browserType];
  const browserPath = browserConfig.executableCandidates().find((candidate) => candidate && existsSync(candidate));
  if (!browserPath) {
    throw new Error(`Could not find the installed ${browserConfig.displayName} path`);
  }
  return browserPath;
}
function isBrowserDebuggingReady(debugPort) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: "127.0.0.1",
        port: debugPort,
        path: "/json/version",
        timeout: 500
      },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      }
    );
    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}
function normalizeUrl(rawUrl) {
  const value = rawUrl.trim();
  if (!value) {
    throw new Error("URL empty");
  }
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    throw new Error("Enter a valid URL, for example google.com");
  }
}

// src/main/otpService.ts
import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
var otpRecords = /* @__PURE__ */ new Map();
var otpLifetimeMs = 5 * 60 * 1e3;
function getTransporter() {
  const email = process.env.SMTP_EMAIL;
  const password = process.env.SMTP_APP_PASSWORD;
  if (!email || !password) {
    throw new Error("Email OTP is not configured. Add SMTP_EMAIL and SMTP_APP_PASSWORD to .env.");
  }
  return {
    email,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: password
      }
    })
  };
}
async function sendPasswordOtp(email) {
  const recipient = email.trim().toLowerCase();
  if (!recipient || !recipient.includes("@")) {
    throw new Error("Enter a valid recovery email address.");
  }
  const code = randomInt(1e5, 1e6).toString();
  const { email: sender, transporter } = getTransporter();
  await transporter.sendMail({
    from: `AutoForm AI <${sender}>`,
    to: recipient,
    subject: "AutoForm AI password reset OTP",
    text: `Your AutoForm AI password reset OTP is ${code}. It expires in 5 minutes.`
  });
  otpRecords.set(recipient, { code, expiresAt: Date.now() + otpLifetimeMs });
}
function verifyPasswordOtp(email, code) {
  const recipient = email.trim().toLowerCase();
  const record = otpRecords.get(recipient);
  if (!record || record.expiresAt < Date.now()) {
    otpRecords.delete(recipient);
    throw new Error("OTP has expired. Send a new OTP.");
  }
  if (record.code !== code.trim()) {
    throw new Error("Incorrect OTP.");
  }
  otpRecords.delete(recipient);
}

// src/main/ipc/browser.ts
function registerBrowserIPC() {
  ipcMain.handle("auth:send-otp", async (_event, email) => {
    try {
      await sendPasswordOtp(email);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not send OTP." };
    }
  });
  ipcMain.handle("auth:verify-otp", async (_event, request) => {
    try {
      verifyPasswordOtp(request.email, request.otp);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not verify OTP." };
    }
  });
  ipcMain.handle("browser:launch", async (_event, request) => {
    try {
      return await launchBrowser(request.url, request.browserType ?? "chrome");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Browser launch failed";
      return { ok: false, error: message };
    }
  });
  ipcMain.handle("browser:read-fields", async () => {
    try {
      return await readFormFields();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Form fields read failed";
      return { ok: false, error: message };
    }
  });
  ipcMain.handle("browser:autofill", async (_event, profileFields) => {
    try {
      return await autofillForm(profileFields);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Autofill failed";
      return { ok: false, error: message };
    }
  });
}

// src/main/main.ts
import path2 from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
try {
  process.loadEnvFile(path2.join(process.cwd(), ".env"));
} catch {
}
var mainWindow = null;
var rendererUrl = "http://localhost:5173";
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    title: "AutoForm AI",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path2.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (app2.isPackaged) {
    void mainWindow.loadFile(path2.join(__dirname, "../dist/index.html"));
  } else {
    void mainWindow.loadURL(rendererUrl);
  }
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== rendererUrl) {
      event.preventDefault();
    }
  });
  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);
}
app2.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerBrowserIPC();
  createWindow();
  app2.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app2.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app2.quit();
  }
});
//# sourceMappingURL=main.js.map
