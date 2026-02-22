export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  icon: "list" | "book" | "layers" | "lightbulb";
  prompt: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "summary_5_points",
    label: "Ringkasan 5 Poin",
    description: "Ringkas, cepat dibaca, dan fokus inti pembahasan.",
    icon: "list",
    prompt:
      "Tolong ringkas teks berikut dalam 5 poin utama yang sangat jelas, padat, dan mudah dipahami.",
  },
  {
    id: "deep_explainer",
    label: "Penjelasan Mendalam",
    description: "Jelaskan menyeluruh tanpa kehilangan konteks.",
    icon: "book",
    prompt:
      "Jelaskan materi berikut secara lengkap, runtut, dan mendalam tanpa kehilangan konteks penting.",
  },
  {
    id: "structured_breakdown",
    label: "Uraian Terstruktur",
    description: "Pecah topik menjadi bagian-bagian sistematis.",
    icon: "layers",
    prompt:
      "Uraikan isi teks menjadi bagian terstruktur: latar belakang, inti pembahasan, detail penting, dan kesimpulan.",
  },
  {
    id: "practical_insights",
    label: "Insight Praktis",
    description: "Fokus tindakan nyata dan poin implementasi.",
    icon: "lightbulb",
    prompt:
      "Ambil insight paling praktis dari teks berikut, lalu jelaskan langkah penerapannya secara konkret.",
  },
];

export function getPromptTemplateById(id: string): PromptTemplate {
  return (
    PROMPT_TEMPLATES.find((item) => item.id === id) ?? PROMPT_TEMPLATES[0]!
  );
}

export function buildPromptWithContext(
  instruction: string,
  content: string,
  meta?: {
    title?: string;
    url?: string;
    siteName?: string;
  },
): string {
  const title = meta?.title || "-";
  const url = meta?.url || "-";
  const siteName = meta?.siteName || "-";
  const cleanedInstruction = instruction.trim();
  const cleanedContent = content.trim();

  return [
    "INSTRUKSI UTAMA:",
    cleanedInstruction,
    "",
    "ATURAN OUTPUT:",
    "1. Gunakan bahasa Indonesia yang jelas dan runtut.",
    "2. Jelaskan lengkap, tapi tetap ringkas dan langsung ke inti.",
    "3. Jangan hilangkan konteks penting dari sumber.",
    "4. Jika ada istilah teknis, jelaskan secara sederhana.",
    "",
    "KONTEKS SUMBER:",
    `- Judul: ${title}`,
    `- Website: ${siteName}`,
    `- URL: ${url}`,
    "",
    "KONTEN YANG HARUS DIANALISIS:",
    cleanedContent,
  ].join("\n");
}
