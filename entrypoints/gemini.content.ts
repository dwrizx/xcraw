import type { PendingAIUpload } from "../lib/types";

const PROMPT_SELECTORS = [
  'rich-textarea div[contenteditable="true"]',
  'div.ql-editor[contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"][aria-label*="prompt"]',
  "textarea",
];

const SEND_BUTTON_SELECTORS = [
  'button[aria-label*="Send"]',
  'button[aria-label*="Kirim"]',
  'button[data-test-id*="send"]',
  'button[type="submit"]',
];

function getSendButton(root: ParentNode = document): HTMLButtonElement | null {
  for (const selector of SEND_BUTTON_SELECTORS) {
    const button = root.querySelector(selector);
    if (button instanceof HTMLButtonElement) return button;
  }
  return null;
}

function getPromptInput(): HTMLElement | null {
  const sendButton = getSendButton();
  const parent = sendButton?.closest("form, main, body");

  if (parent) {
    for (const selector of PROMPT_SELECTORS) {
      const element = parent.querySelector(selector);
      if (element instanceof HTMLElement) return element;
    }
  }

  for (const selector of PROMPT_SELECTORS) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) return element;
  }
  return null;
}

function setPromptValue(element: HTMLElement, value: string): void {
  if (element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  element.focus();
  element.textContent = value;
  element.dispatchEvent(
    new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: value,
    }),
  );
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: value,
    }),
  );
}

export default defineContentScript({
  matches: ["https://gemini.google.com/*"],
  main() {
    let isProcessing = false;

    const clickSendWithRetry = (maxAttempts = 18) => {
      let attempts = 0;
      const tryClick = () => {
        attempts++;
        const sendButton = getSendButton();
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
          return true;
        }
        return false;
      };

      if (tryClick()) return;
      const timer = window.setInterval(() => {
        if (tryClick() || attempts >= maxAttempts) {
          window.clearInterval(timer);
        }
      }, 300);
    };

    const processPendingUpload = (data: PendingAIUpload) => {
      if (data.provider !== "gemini") return;
      if (isProcessing) return;
      isProcessing = true;

      let attempts = 0;
      const maxAttempts = 30;

      const tryFill = () => {
        attempts++;
        const promptInput = getPromptInput();
        if (!promptInput) {
          if (attempts < maxAttempts) {
            window.setTimeout(tryFill, 400);
          } else {
            isProcessing = false;
          }
          return;
        }

        try {
          const mergedPrompt = data.prompt || data.text || "";
          if (mergedPrompt) {
            setPromptValue(promptInput, mergedPrompt);
          }

          browser.storage.local.remove("pendingAIUpload");
          window.setTimeout(() => clickSendWithRetry(), 700);
        } catch (err) {
          console.error("SmartExtract Gemini autofill error:", err);
        } finally {
          isProcessing = false;
        }
      };

      window.setTimeout(tryFill, 1000);
    };

    browser.storage.local.get("pendingAIUpload").then((res) => {
      const data = res.pendingAIUpload as PendingAIUpload | undefined;
      if (data) {
        console.log("SmartExtract: Pending AI upload found for Gemini.", data);
        processPendingUpload(data);
      }
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes.pendingAIUpload?.newValue) {
        return;
      }
      processPendingUpload(changes.pendingAIUpload.newValue as PendingAIUpload);
    });
  },
});
