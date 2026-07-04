import { useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IoSearch } from "react-icons/io5";
import { GrInfo } from "react-icons/gr";
import { AppContext } from "@/providers/AppContext";
import RichText from "@/components/RichText";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8002";

// Cap the checker input (keeps LanguageTool/SymSpell fast; a song's lyrics fit).
const MAX_CHARS = 2000;

interface SpellIssue {
  token: string;
  position: number;
  status: "nonstandard" | "unknown";
  suggestion: string | null;
  base: string;
  suggestions?: { term: string; distance: number }[];
}
interface GrammarIssue {
  rule: string;
  severity: string;
  position: number;
  text: string;
  message: string;
  suggestion: string;
}
interface ReviewData {
  spelling: {
    total_tokens: number;
    valid_tokens: number;
    issue_count: number;
    issues: SpellIssue[];
  };
  grammar: { issue_count: number; issues: GrammarIssue[] };
}

type Span = {
  start: number;
  end: number;
  kind: "spelling" | "grammar";
  label: string;
  suggestion?: string;
};

export default function Check() {
  const { t, i18n } = useTranslation();
  const { screenWidth } = useContext(AppContext);
  const isDesktop = screenWidth > 1080;

  const uiLang = i18n.language === "en" ? "en" : "id";
  const [text, setText] = useState("");
  const [lang, setLang] = useState<"id" | "en">(uiLang);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewData | null>(null);

  // Follow the header ID/EN toggle so the checker language matches the UI.
  useEffect(() => {
    setLang(uiLang);
  }, [uiLang]);

  const runCheck = async (content: string = text) => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      // Both languages return {spelling, grammar}: Indonesian via PUEBI rules,
      // English via LanguageTool (lyrics-mode).
      const endpoint =
        lang === "en" ? "/api/english/review" : "/api/kbbi/review";
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const json = await res.json();
      setResult(json.data as ReviewData);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Re-check against the other language's engine when the toggle changes.
  useEffect(() => {
    if (text.trim()) runCheck(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const applyFix = (start: number, end: number, replacement: string) => {
    // Apply one fix, then re-check the corrected text so the remaining issues
    // keep correct positions (the fixed word drops off; the rest stay).
    const newText = text.slice(0, start) + replacement + text.slice(end);
    setText(newText);
    runCheck(newText);
  };

  const spans: Span[] = [];
  if (result) {
    for (const i of result.spelling.issues) {
      const sug = i.suggestion ?? i.suggestions?.[0]?.term;
      spans.push({
        start: i.position,
        end: i.position + i.token.length,
        kind: "spelling",
        label: t(`check.${i.status}`),
        suggestion: sug ?? undefined,
      });
    }
    for (const g of result.grammar.issues) {
      spans.push({
        start: g.position,
        end: g.position + g.text.length,
        kind: "grammar",
        label: g.message,
        suggestion: g.suggestion,
      });
    }
    spans.sort((a, b) => a.start - b.start);
  }

  const renderHighlighted = (): ReactNode => {
    const nodes: ReactNode[] = [];
    let cursor = 0;
    spans.forEach((s, idx) => {
      if (s.start < cursor) return; // skip overlaps
      if (s.start > cursor)
        nodes.push(<span key={`t${idx}`}>{text.slice(cursor, s.start)}</span>);
      const cls =
        s.kind === "spelling"
          ? "border-b-2 border-red-500 bg-red-500/10"
          : "border-b-2 border-blue-500 bg-blue-500/10";
      nodes.push(
        <mark
          key={`m${idx}`}
          className={`${cls} rounded px-[1px] text-inherit`}
          title={s.label + (s.suggestion ? ` → ${s.suggestion}` : "")}
        >
          {text.slice(s.start, s.end)}
        </mark>
      );
      cursor = s.end;
    });
    nodes.push(<span key="end">{text.slice(cursor)}</span>);
    return nodes;
  };

  const totalIssues = result
    ? result.spelling.issue_count + result.grammar.issue_count
    : 0;

  // Language-mismatch hint: if most words are unknown, the text is probably in
  // the other language (e.g. English text checked with the Indonesian engine).
  const otherLang: "id" | "en" = lang === "id" ? "en" : "id";
  const totalTokens = result?.spelling.total_tokens ?? 0;
  const unknownIssues = result?.spelling.issue_count ?? 0;
  const unknownRate = totalTokens > 0 ? unknownIssues / totalTokens : 0;
  const showMismatch = !!result && totalTokens >= 3 && unknownRate >= 0.5;
  const otherLangName = t(otherLang === "en" ? "check.langNameEn" : "check.langNameId");

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
              {t("check.title")}
            </h1>
            <p className="text-[14px] opacity-70 dark:text-white mt-1">
              <RichText text={t("check.subtitle")} />
            </p>
            <p className="text-[12px] italic opacity-60 dark:text-white mt-1 flex items-center gap-1.5">
              <span className="w-[16px] h-[16px] shrink-0 flex justify-center items-center rounded-full bg-[#ffc778] dark:text-black not-italic">
                <GrInfo className="text-[10px]" strokeWidth={4} />
              </span>
              {t("check.disclaimer")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] opacity-60 dark:text-white">
              {t("check.languageLabel")}:
            </span>
            {langBtn("id", "Indonesia")}
            {langBtn("en", "English")}
          </div>
        </div>

        <div className="w-full rounded-lg bg-[#fceba5] dark:bg-[#000] shadow-lg p-4 dark:shadow-[#c2c2c210]">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                maxLength={MAX_CHARS}
                placeholder={t("check.placeholder")}
                rows={isDesktop ? 8 : 6}
                className="w-full resize-y bg-transparent outline-none dark:text-white text-[15px] leading-7 p-2"
              />
              <div className="flex items-center justify-between gap-3 mt-2">
                <span
                  className={`text-[12px] ${
                    text.length >= MAX_CHARS
                      ? "text-red-500"
                      : "opacity-50 dark:text-white"
                  }`}
                >
                  {text.length}/{MAX_CHARS}
                </span>
                <div className="flex gap-3">
                <button
                  onClick={() => {
                    setText("");
                    setResult(null);
                  }}
                  className="px-4 py-2 rounded-full border-2 border-black dark:border-white dark:text-white text-[14px] font-semibold"
                >
                  {t("check.clear")}
                </button>
                <button
                  onClick={() => runCheck()}
                  disabled={loading || !text.trim()}
                  className="px-5 py-2 rounded-full bg-[#ffc778] dark:text-black font-bold text-[14px] flex items-center gap-2 disabled:opacity-50"
                >
                  <IoSearch />
                  {loading ? t("check.checking") : t("check.button")}
                </button>
                </div>
              </div>
            </div>

            {result && (
              <div className="mt-6 flex flex-col gap-4">
                {showMismatch && (
                  <div className="w-full rounded-lg bg-[#ffe0b0] dark:bg-[#3a2a10] border border-[#ffc778] px-4 py-3 flex items-center gap-3 flex-wrap dark:text-white">
                    <GrInfo className="shrink-0" strokeWidth={4} />
                    <span className="text-[13px] flex-1 min-w-0">
                      {t("check.mismatch", { lang: otherLangName })}
                    </span>
                    <button
                      onClick={() => setLang(otherLang)}
                      className="px-3 py-1 rounded-full bg-black text-white dark:bg-white dark:text-black text-[13px] font-semibold shrink-0"
                    >
                      {t("check.switchTo", { lang: otherLangName })}
                    </button>
                  </div>
                )}
                {/* Highlighted text */}
                <div className="w-full rounded-lg bg-[#fff0da] dark:bg-[#000] shadow-lg p-5 dark:shadow-[#c2c2c210]">
                  <div className="flex items-center gap-4 text-[12px] mb-3 dark:text-white">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-b-2 border-red-500 bg-red-500/10" />
                      {t("check.legendSpelling")}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-b-2 border-blue-500 bg-blue-500/10" />
                      {t("check.legendGrammar")}
                    </span>
                    <span className="ml-auto font-semibold">
                      {totalIssues === 0
                        ? ""
                        : t("check.summary", { count: totalIssues })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-8 dark:text-white text-[15px]">
                    {renderHighlighted()}
                  </p>
                </div>

                {/* Issue list */}
                {totalIssues === 0 ? (
                  <div className="text-center py-6 dark:text-white font-medium">
                    {t("check.noIssues")}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {result.spelling.issues.map((i, idx) => {
                      const end = i.position + i.token.length;
                      // nonstandard → the baku form; unknown → SymSpell options.
                      const terms =
                        i.status === "nonstandard" && i.suggestion
                          ? [i.suggestion]
                          : (i.suggestions ?? []).map((s) => s.term);
                      return (
                        <IssueRow
                          key={`s${idx}`}
                          kind="spelling"
                          badge={t(`check.${i.status}`)}
                          token={i.token}
                          options={terms.map((term) => ({
                            term,
                            apply: () => applyFix(i.position, end, term),
                          }))}
                        />
                      );
                    })}
                    {result.grammar.issues.map((g, idx) => (
                      <IssueRow
                        key={`g${idx}`}
                        kind="grammar"
                        badge={g.rule}
                        token={g.text.trim()}
                        note={g.message}
                        options={[
                          {
                            term: g.suggestion,
                            apply: () =>
                              applyFix(
                                g.position,
                                g.position + g.text.length,
                                g.suggestion
                              ),
                          },
                        ]}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
      </div>
    </div>
  );
}

function IssueRow({
  kind,
  badge,
  token,
  note,
  options,
}: Readonly<{
  kind: "spelling" | "grammar";
  badge: string;
  token: string;
  note?: string;
  options: { term: string; apply: () => void }[];
}>) {
  const { t } = useTranslation();
  const dot = kind === "spelling" ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="w-full rounded-lg bg-[#faebd7] dark:bg-[#111] shadow-sm px-4 py-3 flex items-start gap-3 dark:text-white">
      <span className={`w-2 h-2 mt-2 rounded-full ${dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-x-2">
          <span className="font-semibold line-through decoration-red-400/70">
            {token}
          </span>
          <span className="text-[11px] uppercase tracking-wide opacity-50">
            {badge}
          </span>
        </div>
        {note && <div className="text-[12px] opacity-70 mt-1">{note}</div>}
        {options.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {options.map((o) => (
              <button
                key={o.term}
                onClick={o.apply}
                title={t("check.apply")}
                className="px-3 py-1 rounded-full bg-[#ffc778] hover:bg-[#ffb84d] dark:text-black text-[13px] font-semibold transition-colors"
              >
                {o.term}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[12px] opacity-50 mt-1">
            {t("check.noSuggestions")}
          </div>
        )}
      </div>
    </div>
  );
}
