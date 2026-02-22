import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ExtractionResult } from "./types";

export interface MessagingSchema {
  extractContent(template?: string): ExtractionResult | null;
  extractSelection(template?: string): ExtractionResult | null;
  startInspector(template?: string): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<MessagingSchema>();
