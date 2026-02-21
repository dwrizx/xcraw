import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
// @ts-ignore - plugin-gfm might not have types in some environments
import { gfm } from "turndown-plugin-gfm";
import DOMPurify from "dompurify";
import type { ExtractionResult } from "./types";

/**
 * Enhanced formatter for consistent and professional headers.
 * Only used for Full Page extractions.
 */
function createHeader(
  article: { title: string; byline?: string; siteName?: string },
  url: string,
  isMarkdown: boolean,
): string {
  const separator = "=".repeat(80);
  const dateStr = new Date().toLocaleString();
  const author = article.byline || "Unknown Author";
  const site = article.siteName || new URL(url).hostname;

  const metadata = [
    separator,
    `TITLE   : ${article.title}`,
    `AUTHOR  : ${author}`,
    `SITE    : ${site}`,
    `SOURCE  : ${url}`,
    `DATE    : ${dateStr}`,
    separator,
    "",
  ];

  if (isMarkdown) {
    metadata.push(`# ${article.title}`, "", `Source: [${url}](${url})`, "");
  } else {
    metadata.push(
      article.title.toUpperCase(),
      "=".repeat(article.title.length),
      "",
      `Source: ${url}`,
      "",
    );
  }

  return metadata.join("\n");
}

/**
 * Core extraction function optimized for universal web compatibility.
 */
export async function extractPageContent(
  doc: Document | HTMLElement,
  url: string,
  isSelection: boolean = false,
): Promise<ExtractionResult | null> {
  let title = "";
  let textContent = "";
  let cleanHtml = "";
  let siteName = new URL(url).hostname;
  let byline = "";
  let excerpt = "";

  if (isSelection && doc instanceof HTMLElement) {
    // SELECTION MODE: No headers, just the content
    title = `Selection from ${siteName}`;
    cleanHtml = DOMPurify.sanitize(doc.innerHTML);
    textContent = doc.innerText;
  } else {
    // FULL PAGE MODE: Use Readability and include headers
    const clone = (doc as Document).cloneNode(true) as Document;

    const unwanted = clone.querySelectorAll(
      "nav, footer, .ads, .social-share, .comments, script, style",
    );
    unwanted.forEach((el) => el.remove());

    const reader = new Readability(clone, { keepClasses: false });
    const article = reader.parse();

    if (!article) return null;

    title = article.title || "";
    cleanHtml = DOMPurify.sanitize(article.content || "");
    textContent = article.textContent || "";
    siteName = article.siteName || siteName;
    byline = article.byline || "";
    excerpt = article.excerpt || "";
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    hr: "---",
  });

  try {
    turndownService.use(gfm);
  } catch (_e) {
    // Fallback
  }

  // Absolute URLs for links and images
  turndownService.addRule("absolute-links", {
    filter: (node) => {
      const tag = node.nodeName.toLowerCase();
      return tag === "a" || tag === "img";
    },
    replacement: (content, node) => {
      const el = node as HTMLElement;
      if (el.nodeName === "A") {
        const href = el.getAttribute("href");
        if (href) {
          try {
            const absoluteHref = new URL(href, url).href;
            return `[${content}](${absoluteHref})`;
          } catch {
            return `[${content}](${href})`;
          }
        }
      }
      if (el.nodeName === "IMG") {
        const src = el.getAttribute("src") || el.getAttribute("data-src");
        const alt = el.getAttribute("alt") || "";
        if (src) {
          try {
            const absoluteSrc = new URL(src, url).href;
            return `![${alt}](${absoluteSrc})`;
          } catch {
            return `![${alt}](${src})`;
          }
        }
      }
      return content;
    },
  });

  const markdownBody = turndownService.turndown(cleanHtml);
  const articleInfo = { title, byline, siteName };

  // Logic: Only add header if it's NOT a selection
  const finalMd = isSelection
    ? markdownBody.replace(/\n{3,}/g, "\n\n").trim()
    : createHeader(articleInfo, url, true) +
      markdownBody.replace(/\n{3,}/g, "\n\n");

  const finalTxt = isSelection
    ? textContent.replace(/\n{3,}/g, "\n\n").trim()
    : createHeader(articleInfo, url, false) +
      textContent.replace(/\n{3,}/g, "\n\n");

  return {
    title,
    byline,
    dir: "ltr",
    content: finalMd,
    textContent: finalTxt,
    length: textContent.length,
    excerpt,
    siteName,
    url,
  };
}
