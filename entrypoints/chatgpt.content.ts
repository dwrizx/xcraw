import type { PendingAIUpload } from "../lib/types";

const PROMPT_SELECTORS = [
  "#prompt-textarea",
  "textarea#prompt-textarea",
  '[data-testid="composer-input"]',
  '[data-testid*="composer"] div[contenteditable="true"]',
  "div.ProseMirror[contenteditable='true']",
  'div#prompt-textarea[contenteditable="true"]',
  'div[contenteditable="true"][data-testid*="prompt"]',
  'div[contenteditable="true"][aria-label*="Message"]',
];

const SEND_BUTTON_SELECTORS = [
  'button[data-testid="send-button"]',
  'button[data-testid*="send"]',
  'button[aria-label*="send"]',
  'button[type="submit"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="Kirim"]',
];

function getSendButton(root: ParentNode = document): HTMLButtonElement | null {
  for (const selector of SEND_BUTTON_SELECTORS) {
    const button = root.querySelector(selector);
    if (button instanceof HTMLButtonElement) return button;
  }
  return null;
}

function isUsablePromptElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  if (element.getAttribute("aria-hidden") === "true") {
    return false;
  }
  if (
    element instanceof HTMLTextAreaElement &&
    (element.disabled || element.readOnly)
  ) {
    return false;
  }

  if (element.isContentEditable) return true;
  if (element instanceof HTMLTextAreaElement) return true;

  return element.id === "prompt-textarea";
}

function getPromptInput(): HTMLElement | null {
  const sendButton = getSendButton();
  const formRoot = sendButton?.closest("form");

  if (formRoot) {
    for (const selector of PROMPT_SELECTORS) {
      const element = formRoot.querySelector(selector);
      if (element instanceof HTMLElement && isUsablePromptElement(element)) {
        return element;
      }
    }
  }

  for (const selector of PROMPT_SELECTORS) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement && isUsablePromptElement(element)) {
      return element;
    }
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
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function attachTextAsFile(
  fileInput: HTMLInputElement,
  text: string,
  title?: string,
) {
  const safeTitle = (title || "SmartExtract").replace(/[^a-z0-9]/gi, "_");
  const file = new File([text], `${safeTitle}.txt`, { type: "text/plain" });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
}

export default defineContentScript({
  matches: ["https://chatgpt.com/*", "https://chat.openai.com/*"],
  main() {
    let isProcessing = false;

    const clickSendWithRetry = (maxAttempts = 15) => {
      let sendAttempts = 0;
      const tryClick = () => {
        sendAttempts++;
        const sendButton = getSendButton();
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
          return true;
        }

        const promptInput = getPromptInput();
        if (promptInput && promptInput instanceof HTMLElement) {
          promptInput.focus();
          promptInput.dispatchEvent(
            new KeyboardEvent("keydown", {
              bubbles: true,
              cancelable: true,
              key: "Enter",
              code: "Enter",
            }),
          );
        }
        return false;
      };

      if (tryClick()) return;

      const timer = window.setInterval(() => {
        if (tryClick() || sendAttempts >= maxAttempts) {
          window.clearInterval(timer);
        }
      }, 300);
    };

    const processPendingUpload = (data: PendingAIUpload) => {
      if (data.provider !== "chatgpt") return;
      if (isProcessing) return;
      isProcessing = true;

      let attempts = 0;
      const maxAttempts = 25;

      const attemptAutoFill = () => {
        attempts++;
        const promptInput = getPromptInput();
        const fileInput = document.querySelector('input[type="file"]');

        if (!promptInput) {
          if (attempts < maxAttempts) {
            window.setTimeout(attemptAutoFill, 400);
          } else {
            isProcessing = false;
          }
          return;
        }

        try {
          const promptText = data.prompt || "";
          const fileAttached = fileInput instanceof HTMLInputElement;

          if (data.text && fileAttached) {
            attachTextAsFile(fileInput, data.text, data.title);
          }

          const mergedPrompt = promptText || data.text || "";

          if (mergedPrompt) {
            setPromptValue(promptInput, mergedPrompt);
          }

          browser.storage.local.remove("pendingAIUpload");
          window.setTimeout(() => clickSendWithRetry(), 600);
        } catch (err) {
          console.error("SmartExtract error auto-filling:", err);
        } finally {
          isProcessing = false;
        }
      };

      window.setTimeout(attemptAutoFill, 900);
    };

    browser.storage.local.get("pendingAIUpload").then((res) => {
      const data = res.pendingAIUpload as PendingAIUpload | undefined;
      if (data) {
        console.log("SmartExtract: Pending AI upload found for ChatGPT.", data);
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
