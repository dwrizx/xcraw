import type { PendingAIUpload } from "../lib/types";

const PROMPT_SELECTORS = [
  "fieldset textarea",
  "textarea",
  'div[contenteditable="true"][role="textbox"]',
];

const SEND_BUTTON_SELECTORS = [
  'button[type="submit"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="Kirim"]',
];

function getPromptInput(): HTMLElement | null {
  for (const selector of PROMPT_SELECTORS) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) return element;
  }
  return null;
}

function getSendButton(): HTMLButtonElement | null {
  for (const selector of SEND_BUTTON_SELECTORS) {
    const button = document.querySelector(selector);
    if (button instanceof HTMLButtonElement) return button;
  }
  return null;
}

function setPromptValue(element: HTMLElement, value: string): void {
  if (element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  element.focus();
  element.textContent = value;
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, data: value }),
  );
}

function clickSendWithRetry(maxAttempts = 15) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts++;
    const sendButton = getSendButton();
    if (sendButton && !sendButton.disabled) {
      sendButton.click();
      window.clearInterval(timer);
      return;
    }
    if (attempts >= maxAttempts) window.clearInterval(timer);
  }, 300);
}

export default defineContentScript({
  matches: ["https://claude.ai/*"],
  main() {
    const processPendingUpload = (data: PendingAIUpload) => {
      if (data.provider !== "claude") return;
      let attempts = 0;
      const maxAttempts = 25;
      const fill = () => {
        attempts++;
        const promptInput = getPromptInput();
        if (!promptInput) {
          if (attempts < maxAttempts) window.setTimeout(fill, 400);
          return;
        }
        const prompt = data.prompt || data.text || "";
        if (prompt) setPromptValue(promptInput, prompt);
        browser.storage.local.remove("pendingAIUpload");
        window.setTimeout(() => clickSendWithRetry(), 600);
      };
      window.setTimeout(fill, 900);
    };

    browser.storage.local.get("pendingAIUpload").then((res) => {
      const data = res.pendingAIUpload as PendingAIUpload | undefined;
      if (data) processPendingUpload(data);
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes.pendingAIUpload?.newValue) return;
      processPendingUpload(changes.pendingAIUpload.newValue as PendingAIUpload);
    });
  },
});
