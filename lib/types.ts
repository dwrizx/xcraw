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
