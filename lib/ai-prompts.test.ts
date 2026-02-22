import { describe, expect, it } from "bun:test";
import { buildPromptWithContext, getPromptTemplateById } from "./ai-prompts";

describe("ai-prompts", () => {
  it("builds a contextual prompt that preserves source metadata", () => {
    const result = buildPromptWithContext(
      "Jelaskan secara lengkap dan runtut.",
      "Ini isi artikel yang akan dijelaskan.",
      {
        title: "Panduan Ekstensi",
        url: "https://example.com/guide",
        siteName: "example.com",
      },
    );

    expect(result).toContain("INSTRUKSI UTAMA");
    expect(result).toContain("KONTEKS SUMBER");
    expect(result).toContain("Panduan Ekstensi");
    expect(result).toContain("https://example.com/guide");
    expect(result).toContain("KONTEN YANG HARUS DIANALISIS");
  });

  it("returns template by id and falls back to default", () => {
    const template = getPromptTemplateById("deep_explainer");
    expect(template.id).toBe("deep_explainer");

    const fallback = getPromptTemplateById("unknown-template");
    expect(fallback.id).toBe("summary_5_points");
  });
});
