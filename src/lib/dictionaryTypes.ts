// Dictionary response shapes (KBBI + English WordNet) used by the standalone
// DictionaryModal. Mirrors what the Home page renders; kept separate so the
// modal is self-contained and Home stays untouched.

export interface KbbiMeaning {
  id: number;
  kelas?:
    | string
    | Array<{ kode: string; nama: string; deskripsi: string }>;
  submakna: string | string[];
  info?: string;
  contoh: string | string[];
}

export interface KbbiEntry {
  id: number;
  lema?: string;
  nama?: string;
  keyword?: string;
  kata_dasar?: string | string[];
  bentuk_tidak_baku?: string | string[];
  varian?: string | string[];
  etimologi?:
    | string
    | { bahasa?: string; asal_kata?: string; pelafalan?: string; arti?: string[] }
    | null;
  meanings: KbbiMeaning[];
  kata_turunan?: string | string[];
  gabungan_kata?: string | string[];
  peribahasa?: string | string[];
  idiom?: string | string[];
}

export interface KbbiApiResponse {
  status: "success" | "error";
  data: KbbiEntry[];
  error?: boolean;
  message?: string;
}

export interface EnglishMeaning {
  id: number;
  gloss: string;
  examples: string[];
  synonyms: string[];
}

export interface EnglishEntry {
  id: number;
  display: string;
  pos_label: string;
  pronunciation: string | null;
  forms: string[];
  etymology: string | null;
  meanings: EnglishMeaning[];
}

export interface EnglishApiResponse {
  status: "success" | "error";
  data: EnglishEntry[];
  error?: boolean;
  message?: string;
}

/** Word to display for a KBBI entry, tolerant of both API schemas. */
export const entryLema = (entry: KbbiEntry): string =>
  entry.lema || entry.nama || entry.keyword || "";

/** A field that may be a real array or a JSON-encoded array string. */
export const parseJsonArray = (
  field: string | string[] | undefined
): string[] => {
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    const s = field.trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return s ? [s] : [];
      }
    }
    return s ? [s] : [];
  }
  return [];
};

export type Kelas = { kode: string; nama: string; deskripsi: string };

/** Word-class field: a real array or a JSON-encoded array string. */
export const parseKelasArray = (
  field: string | Kelas[] | undefined
): Array<string | Kelas> => {
  if (Array.isArray(field)) return field;
  if (typeof field !== "string" || !field) return [];
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [field];
  } catch {
    return [field];
  }
};

/** Envelope shape for the toolkit endpoints (syllable / thesaurus). */
export type ToolkitEnvelope = { data?: Record<string, string[]> };
