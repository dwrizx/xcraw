import { describe, expect, it } from "bun:test";
import type { ExtractionResult } from "./types";
import {
  getCachedExtractionForUrl,
  normalizeCacheUrl,
  upsertCachedExtraction,
} from "./extraction-cache";

const sample: ExtractionResult = {
  title: "Sample",
  byline: "Author",
  dir: "ltr",
  content: "# Sample",
  textContent: "Sample text",
  length: 11,
  excerpt: "Sample excerpt",
  siteName: "x.com",
  url: "https://x.com/CuriousMindsHub/status/2025337664753598758",
};

describe("extraction-cache", () => {
  it("normalizes URL by removing hash and trailing slash", () => {
    const normalized = normalizeCacheUrl(
      "https://example.com/path/?q=1#fragment",
    );
    expect(normalized).toBe("https://example.com/path?q=1");
  });

  it("gets cached extraction for an exact normalized URL", () => {
    const cache = upsertCachedExtraction({}, sample.url, sample, 10);
    const hit = getCachedExtractionForUrl(cache, `${sample.url}#test`);
    expect(hit?.title).toBe(sample.title);
  });

  it("keeps cache bounded by max items", () => {
    let cache = {};
    cache = upsertCachedExtraction(
      cache,
      "https://example.com/1",
      { ...sample, url: "https://example.com/1", title: "One" },
      2,
    );
    cache = upsertCachedExtraction(
      cache,
      "https://example.com/2",
      { ...sample, url: "https://example.com/2", title: "Two" },
      2,
    );
    cache = upsertCachedExtraction(
      cache,
      "https://example.com/3",
      { ...sample, url: "https://example.com/3", title: "Three" },
      2,
    );
    const keys = Object.keys(cache);
    expect(keys).toHaveLength(2);
    expect(
      getCachedExtractionForUrl(cache, "https://example.com/3")?.title,
    ).toBe("Three");
  });
});
