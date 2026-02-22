import type { ExtractionResult } from "./types";

export interface CachedExtractionEntry {
  extractedAt: number;
  data: ExtractionResult;
}

export type ExtractionCacheMap = Record<string, CachedExtractionEntry>;

export function normalizeCacheUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getCachedExtractionForUrl(
  cache: ExtractionCacheMap,
  url: string,
): ExtractionResult | null {
  const key = normalizeCacheUrl(url);
  const entry = cache[key];
  return entry?.data ?? null;
}

export function upsertCachedExtraction(
  cache: ExtractionCacheMap,
  url: string,
  data: ExtractionResult,
  maxItems: number = 200,
): ExtractionCacheMap {
  const key = normalizeCacheUrl(url);
  const now = Date.now();

  const merged: ExtractionCacheMap = {
    ...cache,
    [key]: {
      extractedAt: now,
      data,
    },
  };

  const keys = Object.keys(merged).sort((a, b) => {
    const timeDiff = merged[b]!.extractedAt - merged[a]!.extractedAt;
    if (timeDiff !== 0) return timeDiff;
    if (a === key) return -1;
    if (b === key) return 1;
    return 0;
  });

  const keptKeys = keys.slice(0, Math.max(1, maxItems));
  return Object.fromEntries(
    keptKeys.map((itemKey) => [itemKey, merged[itemKey]]),
  );
}
