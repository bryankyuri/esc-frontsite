import { useContext, useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IoSearch } from "react-icons/io5";
import { AppContext } from "@/providers/AppContext";
import {
  rhymeOptions,
  syllableOptions,
  thesaurusOptions,
} from "@/lib/dictionaryApi";
import { DictionaryModal } from "@/components/DictionaryModal";

type ApiEnvelope = { data?: Record<string, string[]> };

export default function Rhyme() {
  const { t, i18n } = useTranslation();
  const { screenWidth } = useContext(AppContext);
  const isDesktop = screenWidth > 1080;

  const uiLang = i18n.language === "en" ? "en" : "id";
  const [input, setInput] = useState("");
  // The submitted term that actually drives the queries (may differ from
  // what's being typed).
  const [word, setWord] = useState("");
  const [lang, setLang] = useState<"id" | "en">(uiLang);
  // Word whose definition is shown in the dictionary popup (null = closed).
  const [dictWord, setDictWord] = useState<string | null>(null);

  // Follow the header ID/EN toggle so the rhyme language matches the UI.
  useEffect(() => {
    setLang(uiLang);
  }, [uiLang]);

  const enabled = word.trim().length > 0;
  const [rhyQ, thQ, sylQ] = useQueries({
    queries: [
      { ...rhymeOptions(lang, word, 100), enabled },
      { ...thesaurusOptions(lang, word), enabled },
      { ...syllableOptions(lang, word), enabled },
    ],
  });

  const loading = enabled && (rhyQ.isFetching || thQ.isFetching || sylQ.isFetching);
  const data = enabled
    ? {
        perfect: (rhyQ.data as ApiEnvelope)?.data?.perfect ?? [],
        near: (rhyQ.data as ApiEnvelope)?.data?.near ?? [],
        synonyms: (thQ.data as ApiEnvelope)?.data?.synonyms ?? [],
        syllables: (sylQ.data as ApiEnvelope)?.data?.syllables ?? [],
      }
    : null;

  // Submit or click a related word → drives the queries above.
  const search = (term: string) => {
    const q = term.trim();
    if (!q) return;
    setInput(q);
    setWord(q);
  };

  const langBtn = (code: "id" | "en", label: string) => (
    <button
      onClick={() => setLang(code)}
      className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
        lang === code
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "border-2 border-black dark:border-white"
      }`}
    >
      {label}
    </button>
  );

  const hasResults =
    data &&
    (data.perfect.length > 0 ||
      data.near.length > 0 ||
      data.synonyms.length > 0);

  return (
    <div
      className={`${
        isDesktop ? "" : "px-4"
      } flex min-h-screen flex-col items-center justify-start`}
    >
      <div className="w-full max-w-[1080px] mt-[36px] mb-[48px]">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1
              className={`${
                isDesktop ? "text-[36px]" : "text-[24px]"
              } font-bold dark:text-white`}
            >
              {t("rhyme.title")}
            </h1>
            <p className="text-[14px] opacity-70 dark:text-white mt-1">
              {t("rhyme.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] opacity-60 dark:text-white">
              {t("rhyme.languageLabel")}:
            </span>
            {langBtn("id", "Indonesia")}
            {langBtn("en", "English")}
          </div>
        </div>

        <form
              onSubmit={(e) => {
                e.preventDefault();
                search(input);
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 40))}
                maxLength={40}
                placeholder={t("rhyme.placeholder")}
                className="flex-1 min-w-0 px-4 py-3 rounded-lg bg-[#fceba5] dark:bg-[#000] dark:text-white outline-none text-[16px] shadow-sm dark:shadow-[#c2c2c210]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 px-5 py-3 rounded-lg bg-[#ffc778] dark:text-black font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <IoSearch />
                {loading ? t("rhyme.searching") : t("rhyme.button")}
              </button>
            </form>

            {data && (
              <div className="mt-6">
                {data.syllables.length > 0 && (
                  <div className="mb-4 dark:text-white">
                    <span className="font-semibold">{t("rhyme.syllables")}: </span>
                    <span className="text-[18px]">
                      {data.syllables.join(" · ")}
                    </span>
                    <span className="opacity-60"> ({data.syllables.length})</span>
                  </div>
                )}

                {!hasResults ? (
                  <div className="text-center py-8 dark:text-white opacity-70">
                    {t("rhyme.none")}
                  </div>
                ) : (
                  <div
                    className={`grid gap-4 ${
                      isDesktop ? "grid-cols-3" : "grid-cols-1"
                    }`}
                  >
                    <Section
                      title={t("rhyme.perfect")}
                      words={data.perfect}
                      accent
                      onPick={setDictWord}
                    />
                    <Section
                      title={t("rhyme.near")}
                      words={data.near}
                      onPick={setDictWord}
                    />
                    <Section
                      title={t("rhyme.synonyms")}
                      words={data.synonyms}
                      clickable={false}
                      onPick={search}
                    />
                  </div>
                )}
              </div>
            )}
      </div>

      <DictionaryModal
        word={dictWord}
        lang={lang}
        onClose={() => setDictWord(null)}
      />
    </div>
  );
}

function Section({
  title,
  words,
  accent,
  clickable = true,
  onPick,
}: {
  readonly title: string;
  readonly words: string[];
  readonly accent?: boolean;
  readonly clickable?: boolean;
  readonly onPick: (w: string) => void;
}) {
  if (words.length === 0) return null;
  const base = "px-3 py-1 rounded-full text-[13px]";
  const style = accent
    ? "bg-[#ffc778] dark:text-black font-medium"
    : "border border-gray-300 dark:border-gray-600 dark:text-white";
  return (
    <div className="rounded-lg bg-[#fff0da] dark:bg-[#000] shadow-lg p-4 dark:shadow-[#c2c2c210]">
      <div className="font-bold dark:text-white mb-3 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-[12px] opacity-50 font-normal">{words.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {words.map((w) =>
          clickable ? (
            <button
              key={w}
              onClick={() => onPick(w)}
              className={`${base} ${style} transition-colors ${
                accent ? "hover:bg-[#ffb84d]" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {w}
            </button>
          ) : (
            <span key={w} className={`${base} ${style}`}>
              {w}
            </span>
          )
        )}
      </div>
    </div>
  );
}
