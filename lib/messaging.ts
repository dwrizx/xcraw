import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ExtractionResult } from "./types";

export interface MessagingSchema {
  extractContent(): ExtractionResult | null;
  extractSelection(): ExtractionResult | null;
  startInspector(): void;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<MessagingSchema>();
