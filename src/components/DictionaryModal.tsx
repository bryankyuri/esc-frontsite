// Self-contained dictionary popup for the Rhyme page. Renders the same rich
// layout as the Home page dictionary — full KBBI/English entry plus a toolkit
// footer (Suku Kata + Sinonim) — but WITHOUT the Rima section, since the user
// is already on the rhyme page. Fetches through the shared TanStack cache, so
// a word already seen resolves instantly.

import { useQueries, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { IoCloseOutline } from "react-icons/io5";
import {
  searchOptions,
  syllableOptions,
  thesaurusOptions,
  type DictLang,
} from "@/lib/dictionaryApi";
import {
  entryLema,
  parseJsonArray,
  parseKelasArray,
  type EnglishApiResponse,
  type KbbiApiResponse,
  type ToolkitEnvelope,
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
  const enabled = !!word;

  const { data, isFetching, isError } = useQuery({
    ...searchOptions(lang, word ?? ""),
    enabled,
  });
  // Toolkit: syllables + synonyms (no rhymes — that's the omitted section).
  const [sylQ, thQ] = useQueries({
    queries: [
      { ...syllableOptions(lang, word ?? ""), enabled },
      { ...thesaurusOptions(lang, word ?? ""), enabled },
    ],
  });

  const kbbi = !isEn ? (data as KbbiApiResponse | undefined) : undefined;
  const eng = isEn ? (data as EnglishApiResponse | undefined) : undefined;
  const entries = (isEn ? eng?.data : kbbi?.data) ?? [];
  const isEmpty = !isFetching && !isError && entries.length === 0;

  const syllables = (sylQ.data as ToolkitEnvelope)?.data?.syllables ?? [];
  const synonyms = (thQ.data as ToolkitEnvelope)?.data?.synonyms ?? [];

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
            className="w-full max-w-[720px] max-h-[90vh] flex flex-col rounded-xl bg-[#fff0da] dark:bg-black dark:text-white shadow-lg dark:shadow-[#c2c2c240] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center">
                <div className="text-2xl mr-3">📖</div>
                <h2 className="text-xl font-bold">
                  {isEn ? t("home.dict.titleEn") : t("home.dict.title")}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-2xl hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-2 transition-colors"
                aria-label="close"
              >
                <IoCloseOutline />
              </button>
            </div>

            {/* Searched word */}
            <div className="p-6 underline text-[28px] font-bold w-full flex items-center justify-center text-center italic shrink-0">
              {word}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isFetching ? (
                <div className="flex items-center justify-center p-12 opacity-60">
                  {t("home.dict.loading")}
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center p-12 text-red-600 dark:text-red-400">
                  {t("home.dict.error")}
                </div>
              ) : isEmpty ? (
                <div className="p-12 text-center">
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

              {/* Toolkit — Suku Kata + Sinonim (Rima intentionally omitted) */}
              {!isFetching &&
                !isError &&
                (syllables.length > 0 || synonyms.length > 0) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-4">
                    {syllables.length > 0 && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t("home.dict.sukuKata")}:{" "}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {syllables.join(" · ")}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {" "}
                          ({syllables.length})
                        </span>
                      </div>
                    )}
                    {synonyms.length > 0 && (
                      <div>
                        <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2">
                          {t("home.dict.sinonim")}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {synonyms.slice(0, 30).map((s) => (
                            <span
                              key={s}
                              className="px-3 py-1 rounded-full bg-[#ffc778] dark:text-black text-[13px] font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EnglishEntries({ data }: { readonly data: EnglishApiResponse["data"] }) {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      {data.map((entry) => (
        <div
          key={entry.id}
          className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0 last:mb-0 last:pb-0"
        >
          <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1 mb-3">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {entry.display}
            </h2>
            {entry.pos_label && (
              <span className="inline-block bg-[#ffc778] text-black text-xs px-2 py-1 rounded-full font-medium">
                {entry.pos_label}
              </span>
            )}
            {entry.pronunciation && (
              <span className="text-gray-500 dark:text-gray-400 italic">
                /{entry.pronunciation}/
              </span>
            )}
          </div>

          {entry.forms.length > 0 && (
            <div className="text-sm mb-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {t("home.dict.forms")}:{" "}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {entry.forms.join(", ")}
              </span>
            </div>
          )}
          {entry.etymology && (
            <div className="text-sm mb-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {t("home.dict.etimologi")}:{" "}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {entry.etymology}
              </span>
            </div>
          )}

          <div className="space-y-3 mt-3">
            {entry.meanings.map((m, i) => (
              <div
                key={m.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
              >
                <div className="text-sm">
                  <span className="text-gray-900 dark:text-gray-100">
                    {i + 1}.{" "}
                  </span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {m.gloss}
                  </span>
                </div>
                {m.examples.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.examples.map((ex, j) => (
                      <div
                        key={j}
                        className="text-sm text-gray-600 dark:text-gray-400 italic"
                      >
                        • {ex}
                      </div>
                    ))}
                  </div>
                )}
                {m.synonyms.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
}

function KbbiEntries({ data }: { readonly data: KbbiApiResponse["data"] }) {
  const { t } = useTranslation();
  return (
    <div className="p-6">
      {data.map((entry) => {
        const kataDasar = parseJsonArray(entry.kata_dasar);
        const tidakBaku = parseJsonArray(entry.bentuk_tidak_baku);
        const varian = parseJsonArray(entry.varian);
        const turunan = parseJsonArray(entry.kata_turunan);
        const gabungan = parseJsonArray(entry.gabungan_kata);
        const peribahasa = parseJsonArray(entry.peribahasa);
        const idiom = parseJsonArray(entry.idiom);
        return (
          <div
            key={entry.id}
            className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0 last:mb-0 last:pb-0"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              {entryLema(entry)}
            </h2>

            <div className="space-y-2 mb-4 text-sm">
              {kataDasar.length > 0 && (
                <Field label={t("home.dict.kataDasar")} value={kataDasar.join(", ")} />
              )}
              {tidakBaku.length > 0 && (
                <Field
                  label={t("home.dict.bentukTidakBaku")}
                  value={tidakBaku.join(", ")}
                />
              )}
              {varian.length > 0 && (
                <Field label={t("home.dict.varian")} value={varian.join(", ")} />
              )}
              {entry.etimologi && (
                <Field
                  label={t("home.dict.etimologi")}
                  value={
                    typeof entry.etimologi === "string"
                      ? entry.etimologi
                      : [
                          entry.etimologi?.bahasa,
                          entry.etimologi?.asal_kata,
                          entry.etimologi?.arti?.join(", "),
                        ]
                          .filter(Boolean)
                          .join(" — ")
                  }
                />
              )}
            </div>

            {/* Meanings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                {t("home.dict.arti")}:
              </h3>
              {entry.meanings.map((meaning, mi) => {
                const kelas = parseKelasArray(meaning.kelas);
                const contoh = parseJsonArray(meaning.contoh);
                return (
                  <div
                    key={meaning.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                  >
                    {kelas.length > 0 && (
                      <div className="mb-2">
                        {kelas.map((k, ki) => (
                          <span
                            key={ki}
                            className="inline-block bg-[#ffc778] text-black text-xs px-2 py-1 rounded-full mr-2 font-medium"
                          >
                            {typeof k === "string" ? k : `${k.nama} (${k.kode})`}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mb-3 text-sm">
                      <span className="text-gray-900 dark:text-gray-100">
                        {mi + 1}.{" "}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200">
                        {Array.isArray(meaning.submakna)
                          ? meaning.submakna.join(", ")
                          : meaning.submakna}
                      </span>
                      {meaning.info && (
                        <span className="text-gray-600 dark:text-gray-400 italic ml-2">
                          ({meaning.info})
                        </span>
                      )}
                    </div>
                    {contoh.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {t("home.dict.contoh")}:
                        </span>
                        <div className="mt-1 space-y-1">
                          {contoh.map((ex, ei) => (
                            <div
                              key={ei}
                              className="text-sm text-gray-600 dark:text-gray-400 italic"
                            >
                              • {ex}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Additional sections */}
            {(turunan.length > 0 ||
              gabungan.length > 0 ||
              peribahasa.length > 0 ||
              idiom.length > 0) && (
              <div className="mt-6 space-y-3 text-sm">
                {turunan.length > 0 && (
                  <Field
                    label={t("home.dict.kataTurunan")}
                    value={turunan.join(", ")}
                  />
                )}
                {gabungan.length > 0 && (
                  <Field
                    label={t("home.dict.gabunganKata")}
                    value={gabungan.join(", ")}
                  />
                )}
                {peribahasa.length > 0 && (
                  <Field
                    label={t("home.dict.peribahasa")}
                    value={peribahasa.join(", ")}
                  />
                )}
                {idiom.length > 0 && (
                  <Field label={t("home.dict.idiom")} value={idiom.join(", ")} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <span className="font-semibold text-gray-700 dark:text-gray-300">
        {label}:{" "}
      </span>
      <span className="text-gray-600 dark:text-gray-400">{value}</span>
    </div>
  );
}
