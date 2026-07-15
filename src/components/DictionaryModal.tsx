// Self-contained dictionary popup for the Rhyme page. Given a word + language
// it fetches the definition through the shared TanStack cache (so a word
// already searched is instant) and renders both KBBI and English shapes.

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { IoCloseOutline } from "react-icons/io5";
import { searchOptions, type DictLang } from "@/lib/dictionaryApi";
import {
  entryLema,
  toArray,
  type EnglishApiResponse,
  type KbbiApiResponse,
} from "@/lib/dictionaryTypes";

export function DictionaryModal({
  word,
  lang,
  onClose,
}: {
  readonly word: string | null;
  readonly lang: DictLang;
  readonly onClose: () => void;
}) {
  const { t } = useTranslation();
  const isEn = lang === "en";

  const { data, isFetching, isError } = useQuery({
    ...searchOptions(lang, word ?? ""),
    enabled: !!word,
  });

  const kbbi = !isEn ? (data as KbbiApiResponse | undefined) : undefined;
  const eng = isEn ? (data as EnglishApiResponse | undefined) : undefined;
  const entries = (isEn ? eng?.data : kbbi?.data) ?? [];
  const isEmpty = !isFetching && !isError && entries.length === 0;

  return (
    <AnimatePresence>
      {word && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[100] bg-[#000000b0] dark:bg-[#19191970] flex items-center justify-center p-4 overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[640px] max-h-[85vh] flex flex-col rounded-2xl bg-[#fff0da] dark:bg-black dark:text-white shadow-lg dark:shadow-[#c2c2c240] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/10 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[22px]">📖</span>
                <h2 className="text-[18px] font-bold">
                  {isEn ? t("home.dict.titleEn") : t("home.dict.title")}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-[24px] rounded-full p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
                aria-label="close"
              >
                <IoCloseOutline />
              </button>
            </div>

            {/* Searched word */}
            <div className="px-6 pt-5 text-[26px] font-bold italic text-center underline shrink-0">
              {word}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {isFetching ? (
                <div className="py-12 text-center opacity-60">
                  {t("home.dict.loading")}
                </div>
              ) : isError ? (
                <div className="py-12 text-center text-red-600 dark:text-red-400">
                  {t("home.dict.error")}
                </div>
              ) : isEmpty ? (
                <div className="py-12 text-center">
                  <p className="opacity-70 mb-1">{t("home.dict.notFound")}</p>
                  <p className="text-sm opacity-50">
                    {t("home.dict.tryAnother")}
                  </p>
                </div>
              ) : isEn ? (
                <EnglishEntries data={eng?.data ?? []} />
              ) : (
                <KbbiEntries data={kbbi?.data ?? []} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EnglishEntries({
  data,
}: {
  readonly data: EnglishApiResponse["data"];
}) {
  const { t } = useTranslation();
  return (
    <>
      {data.map((entry) => (
        <div
          key={entry.id}
          className="mb-6 pb-5 border-b border-black/10 dark:border-white/10 last:border-b-0 last:mb-0 last:pb-0"
        >
          <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1 mb-3">
            <span className="text-[20px] font-bold">{entry.display}</span>
            {entry.pos_label && (
              <span className="text-[11px] font-medium bg-[#ffc778] text-black px-2 py-0.5 rounded-full">
                {entry.pos_label}
              </span>
            )}
            {entry.pronunciation && (
              <span className="italic opacity-60">/{entry.pronunciation}/</span>
            )}
          </div>
          <div className="space-y-2.5">
            {entry.meanings.map((m, i) => (
              <div
                key={m.id}
                className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] p-3.5"
              >
                <div className="text-[14px]">
                  {i + 1}. {m.gloss}
                </div>
                {m.examples.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {m.examples.map((ex, j) => (
                      <div key={j} className="text-[13px] italic opacity-70">
                        • {ex}
                      </div>
                    ))}
                  </div>
                )}
                {m.synonyms.length > 0 && (
                  <div className="mt-1.5 text-[12px] opacity-60">
                    <span className="font-semibold">
                      {t("home.dict.sinonim")}:{" "}
                    </span>
                    {m.synonyms.slice(0, 6).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function KbbiEntries({ data }: { readonly data: KbbiApiResponse["data"] }) {
  return (
    <>
      {data.map((entry) => (
        <div
          key={entry.id}
          className="mb-6 pb-5 border-b border-black/10 dark:border-white/10 last:border-b-0 last:mb-0 last:pb-0"
        >
          <div className="text-[20px] font-bold mb-3">{entryLema(entry)}</div>
          <div className="space-y-2.5">
            {entry.meanings.map((m, i) => {
              const defs = toArray(m.submakna);
              const examples = toArray(m.contoh);
              return (
                <div
                  key={m.id}
                  className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] p-3.5"
                >
                  <div className="text-[14px]">
                    {i + 1}. {defs.join("; ")}
                  </div>
                  {examples.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {examples.map((ex, j) => (
                        <div key={j} className="text-[13px] italic opacity-70">
                          • {ex}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
