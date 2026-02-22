import type { PendingAIUpload } from "../lib/types";

const PROMPT_SELECTORS = [
  "ms-prompt-input textarea",
  "ms-autosize-textarea textarea",
  'textarea[aria-label*="prompt"]',
  'textarea[aria-label*="Type"]',
  'textarea[placeholder*="Enter"]',
  'textarea[placeholder*="prompt"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"][aria-label*="prompt"]',
  "textarea",
];

const SEND_BUTTON_SELECTORS = [
  'button[aria-label*="Run"]',
  'button[aria-label*="Send"]',
  'button[type="submit"]',
  'button[data-testid*="send"]',
  'button[mattooltip*="Run"]',
];

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  return true;
}

function isUsablePrompt(element: HTMLElement): boolean {
  if (!isVisible(element)) return false;
  if (
    element instanceof HTMLTextAreaElement &&
    (element.disabled || element.readOnly)
  ) {
    return false;
  }
  return true;
}

function bestPromptCandidate(root: ParentNode = document): HTMLElement | null {
  const candidates: HTMLElement[] = [];
  for (const selector of PROMPT_SELECTORS) {
    const nodes = root.querySelectorAll(selector);
    for (const node of nodes) {
      if (node instanceof HTMLElement && isUsablePrompt(node)) {
        candidates.push(node);
      }
    }
  }

  if (candidates.length === 0) return null;

  // Prefer composer near bottom viewport (usual chat input position)
  candidates.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return br.bottom - ar.bottom;
  });

  return candidates[0] ?? null;
}

function getPromptText(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement) return element.value;
  return element.textContent?.trim() || "";
}

function setPromptValue(element: HTMLElement, value: string): void {
  if (element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    if (setter) setter.call(element, value);
    else element.value = value;

    element.focus();
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(
      new KeyboardEvent("keyup", { bubbles: true, key: " " }),
    );
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

function findSendButton(promptInput: HTMLElement): HTMLButtonElement | null {
  const context =
    promptInput.closest("form") ||
    promptInput.closest("ms-prompt-input") ||
    promptInput.closest("main") ||
    document;

  for (const selector of SEND_BUTTON_SELECTORS) {
    const withinContext = context.querySelector(selector);
    if (
      withinContext instanceof HTMLButtonElement &&
      isVisible(withinContext) &&
      !withinContext.disabled
    ) {
      return withinContext;
    }
  }

  for (const selector of SEND_BUTTON_SELECTORS) {
    const global = document.querySelector(selector);
    if (
      global instanceof HTMLButtonElement &&
      isVisible(global) &&
      !global.disabled
    ) {
      return global;
    }
  }

  return null;
}

function triggerEnter(promptInput: HTMLElement): void {
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

function clickSendWithRetry(promptInput: HTMLElement, maxAttempts = 22): void {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts++;
    const sendButton = findSendButton(promptInput);
    if (sendButton) {
      sendButton.click();
      window.clearInterval(timer);
      return;
    }

    if (attempts % 3 === 0) {
      triggerEnter(promptInput);
    }

    if (attempts >= maxAttempts) {
      window.clearInterval(timer);
    }
  }, 350);
}

export default defineContentScript({
  matches: ["https://aistudio.google.com/*"],
  main() {
    let isProcessing = false;

    const processPendingUpload = (data: PendingAIUpload) => {
      if (data.provider !== "aistudio") return;
      if (isProcessing) return;
      isProcessing = true;

      const prompt = data.prompt || data.text || "";
      let attempts = 0;
      const maxAttempts = 45;

      const fill = () => {
        attempts++;
        const promptInput = bestPromptCandidate(document);

        if (!promptInput) {
          if (attempts < maxAttempts) {
            window.setTimeout(fill, 400);
          } else {
            isProcessing = false;
          }
          return;
        }

        if (prompt) {
          setPromptValue(promptInput, prompt);
        }

        const current = getPromptText(promptInput);
        if (!current && attempts < maxAttempts) {
          window.setTimeout(fill, 300);
          return;
        }

        browser.storage.local.remove("pendingAIUpload");
        window.setTimeout(() => clickSendWithRetry(promptInput), 700);
        isProcessing = false;
      };

      // /prompts/new_chat or ?project=... can need longer hydration time.
      window.setTimeout(fill, 1400);
    };

    const checkPending = () => {
      browser.storage.local.get("pendingAIUpload").then((res) => {
        const data = res.pendingAIUpload as PendingAIUpload | undefined;
        if (data) processPendingUpload(data);
      });
    };

    checkPending();

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes.pendingAIUpload?.newValue) return;
      processPendingUpload(changes.pendingAIUpload.newValue as PendingAIUpload);
    });

    window.addEventListener("focus", checkPending);

    const observer = new MutationObserver(() => {
      checkPending();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  },
});
