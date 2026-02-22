export interface ExtractionResult {
  title: string;
  byline: string;
  dir: string;
  content: string; // Markdown format
  textContent: string; // Plain text
  length: number;
  excerpt: string;
  siteName: string;
  url: string;
}

export interface ExtractorMessage {
  action: "EXTRACT_CONTENT";
}

export interface UserSettings {
  customTemplate: string;
  aiProvider: string;
  aiPrompt: string;
}

export interface PendingChatGPTUpload {
  text?: string;
  title?: string;
  prompt?: string;
}

export type ExtractionSource = "full" | "selection" | "picker";
export type OutputFormat = "MD" | "TXT";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  title: string;
  url: string;
  siteName: string;
  source: ExtractionSource;
  format: OutputFormat;
  content: string;
  textContent: string;
}

export const DEFAULT_TEMPLATE = `================================================================================
TITLE   : {{title}}
AUTHOR  : {{author}}
SOURCE  : {{url}}
DATE    : {{date}}
================================================================================

# {{title}}

Source: [{{url}}]({{url}})

{{content}}`;

export const DEFAULT_AI_PROMPT =
  "Tolong ringkas teks berikut dalam 5 poin utama yang sangat jelas dan mudah dipahami:";
export const DEFAULT_AI_URL = "https://chatgpt.com/";
