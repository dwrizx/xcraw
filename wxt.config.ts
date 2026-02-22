import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "SmartExtract",
    description:
      "Extract web content into clean Markdown or Plain Text instantly.",
    version: "2.4.1",
    permissions: ["activeTab", "scripting", "storage"],
    action: {
      default_popup: "entrypoints/popup/index.html",
      default_icon: "icon.svg",
    },
    icons: {
      "16": "icon.svg",
      "32": "icon.svg",
      "48": "icon.svg",
      "128": "icon.svg",
    },
  },
});
