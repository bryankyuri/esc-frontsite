import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoSearch } from "react-icons/io5";
import { AppContext } from "@/providers/AppContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8002";

interface RhymeData {
  syllables: string[];
  perfect: string[];
  near: string[];
  synonyms: string[];
}

export default function Rhyme() {
  const { t, i18n } = useTranslation();
  const { screenWidth } = useContext(AppContext);
  const isDesktop = screenWidth > 1080;

  const uiLang = i18n.language === "en" ? "en" : "id";
  const [word, setWord] = useState("");
  const [lang, setLang] = useState<"id" | "en">(uiLang);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RhymeData | null>(null);

  // Follow the header ID/EN toggle so the rhyme language matches the UI.
  useEffect(() => {
    setLang(uiLang);
  }, [uiLang]);

  const search = async (term: string) => {
    const q = term.trim();
    if (!q) return;
    setWord(q);
    setLoading(true);
    const w = encodeURIComponent(q);
    const base = `${API_BASE_URL}/api/${lang === "en" ? "english" : "kbbi"}`;
    try {
      const [rhyRes, thRes, sylRes] = await Promise.all([
        fetch(`${base}/rhyme?word=${w}&limit=100`),
        fetch(`${base}/thesaurus?word=${w}`),
        fetch(`${base}/syllable?word=${w}`),
      ]);
      const [rhy, th, syl] = await Promise.all([
        rhyRes.json(),
        thRes.json(),
        sylRes.json(),
      ]);
      setData({
        perfect: rhy?.data?.perfect ?? [],
        near: rhy?.data?.near ?? [],
        synonyms: th?.data?.synonyms ?? [],
        syllables: syl?.data?.syllables ?? [],
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Re-run the search against the other language's endpoints on toggle.
  useEffect(() => {
    if (word.trim()) search(word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

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
                search(word);
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value.slice(0, 40))}
                maxLength={40}
                placeholder={t("rhyme.placeholder")}
                className="flex-1 px-4 py-3 rounded-lg bg-[#fceba5] dark:bg-[#000] dark:text-white outline-none text-[16px] shadow-sm dark:shadow-[#c2c2c210]"
              />
              <button
                type="submit"
                disabled={loading || !word.trim()}
                className="px-5 py-3 rounded-lg bg-[#ffc778] dark:text-black font-bold flex items-center gap-2 disabled:opacity-50"
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
                      onPick={search}
                    />
                    <Section
                      title={t("rhyme.near")}
                      words={data.near}
                      onPick={search}
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
