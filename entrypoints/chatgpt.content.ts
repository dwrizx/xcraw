import type { PendingChatGPTUpload } from "../lib/types";

const PROMPT_SELECTORS = [
  "#prompt-textarea",
  "textarea#prompt-textarea",
  'div#prompt-textarea[contenteditable="true"]',
  'div[contenteditable="true"][data-testid*="prompt"]',
  'div[contenteditable="true"][aria-label*="Message"]',
  "textarea",
];

const SEND_BUTTON_SELECTORS = [
  'button[data-testid="send-button"]',
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
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  element.textContent = value;
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, data: value }),
  );
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
  matches: ["https://chatgpt.com/*"],
  main() {
    browser.storage.local.get("pendingChatGPTUpload").then((res) => {
      const data = res.pendingChatGPTUpload as PendingChatGPTUpload | undefined;
      if (data) {
        console.log("SmartExtract: Pending ChatGPT upload found.", data);

        let attempts = 0;
        const maxAttempts = 20;
        let sendAttempts = 0;

        const attemptAutoFill = () => {
          attempts++;
          const promptInput = getPromptInput();
          const fileInput = document.querySelector('input[type="file"]');

          if (promptInput) {
            try {
              const promptText = data.prompt || "";
              const fileAttached = fileInput instanceof HTMLInputElement;

              if (data.text && fileAttached) {
                attachTextAsFile(fileInput, data.text, data.title);
              }

              const mergedPrompt =
                data.text && !fileAttached
                  ? `${promptText}\n\n---\n${data.text}`.trim()
                  : promptText;

              if (mergedPrompt) {
                setPromptValue(promptInput, mergedPrompt);
              }

              // Clear storage only after successful prompt fill.
              browser.storage.local.remove("pendingChatGPTUpload");
              setTimeout(clickSendWithRetry, 500);
            } catch (err) {
              console.error("SmartExtract error auto-filling:", err);
            }
          } else {
            if (attempts < maxAttempts) {
              setTimeout(attemptAutoFill, 500);
            } else {
              browser.storage.local.remove("pendingChatGPTUpload");
            }
          }
        };

        const clickSendWithRetry = () => {
          sendAttempts++;
          const sendButton = getSendButton();

          if (sendButton && !sendButton.disabled) {
            sendButton.click();
          } else if (sendAttempts < 10) {
            setTimeout(clickSendWithRetry, 300);
          }
        };

        // Give page some time to fully load UI
        setTimeout(attemptAutoFill, 1500);
      }
    });
  },
});
