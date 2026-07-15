// Shared dictionary/rhyme fetchers as TanStack Query option factories.
// Home (Object Writing) and the Rhyme page use the same keys, so a word
// looked up on one page is cached for the other. Entries barely change, so
// the global staleTime (1h, set in main.tsx) makes repeat lookups instant.

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8002";

export type DictLang = "id" | "en";

const base = (lang: DictLang) =>
  `${API_BASE_URL}/api/${lang === "en" ? "english" : "kbbi"}`;

async function getJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const enc = encodeURIComponent;

export function searchOptions(lang: DictLang, word: string) {
  return {
    queryKey: ["dict", "search", lang, word] as const,
    queryFn: () => getJson(`${base(lang)}/search?keyword=${enc(word)}`),
  };
}

export function syllableOptions(lang: DictLang, word: string) {
  return {
    queryKey: ["dict", "syllable", lang, word] as const,
    queryFn: () => getJson(`${base(lang)}/syllable?word=${enc(word)}`),
  };
}

export function thesaurusOptions(lang: DictLang, word: string) {
  return {
    queryKey: ["dict", "thesaurus", lang, word] as const,
    queryFn: () => getJson(`${base(lang)}/thesaurus?word=${enc(word)}`),
  };
}

export function rhymeOptions(lang: DictLang, word: string, limit: number) {
  return {
    queryKey: ["dict", "rhyme", lang, word, limit] as const,
    queryFn: () =>
      getJson(`${base(lang)}/rhyme?word=${enc(word)}&limit=${limit}`),
  };
}
