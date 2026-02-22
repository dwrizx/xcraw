import type { PendingChatGPTUpload } from "../lib/types";

export default defineContentScript({
  matches: ["https://chatgpt.com/*"],
  main() {
    browser.storage.local.get("pendingChatGPTUpload").then((res) => {
      const data = res.pendingChatGPTUpload as PendingChatGPTUpload | undefined;
      if (data) {
        console.log("SmartExtract: Pending ChatGPT upload found.", data);

        let attempts = 0;
        const maxAttempts = 20;

        const attemptAutoFill = () => {
          attempts++;
          const textarea = document.querySelector(
            "#prompt-textarea",
          ) as HTMLTextAreaElement | null;
          const fileInput = document.querySelector(
            'input[type="file"]',
          ) as HTMLInputElement | null;

          if (textarea && fileInput) {
            try {
              // 1. Create and attach file
              if (data.text) {
                const safeTitle = (data.title || "SmartExtract").replace(
                  /[^a-z0-9]/gi,
                  "_",
                );
                const file = new File([data.text], `${safeTitle}.txt`, {
                  type: "text/plain",
                });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event("change", { bubbles: true }));
              }

              // 2. Set the prompt text
              if (data.prompt) {
                const isDiv = textarea.tagName !== "TEXTAREA";
                if (isDiv) {
                  const p = textarea.querySelector("p");
                  if (p) {
                    p.textContent = data.prompt;
                    textarea.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                  } else {
                    textarea.innerHTML = `<p>${data.prompt}</p>`;
                    textarea.dispatchEvent(
                      new Event("input", { bubbles: true }),
                    );
                  }
                } else {
                  textarea.value = data.prompt;
                  textarea.dispatchEvent(new Event("input", { bubbles: true }));
                }

                // For React synthetic events
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLTextAreaElement.prototype,
                  "value",
                )?.set;
                if (nativeInputValueSetter && !isDiv) {
                  nativeInputValueSetter.call(textarea, data.prompt);
                  textarea.dispatchEvent(new Event("input", { bubbles: true }));
                }
              }

              // Clear from storage immediately
              browser.storage.local.remove("pendingChatGPTUpload");

              // 3. Wait and click send button
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

        let sendAttempts = 0;
        const clickSendWithRetry = () => {
          sendAttempts++;
          const sendButton = document.querySelector(
            'button[data-testid="send-button"]',
          ) as HTMLButtonElement | null;

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
