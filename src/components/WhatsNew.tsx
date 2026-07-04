import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { IoCloseOutline } from "react-icons/io5";
import RichText from "@/components/RichText";

// Bump this whenever you ship a changelog worth re-showing. Visitors who last
// saw an older version get the modal again automatically.
const CHANGELOG_VERSION = "1.1";
const STORAGE_KEY = "esc_changelog_version";

const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export default function WhatsNew() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== CHANGELOG_VERSION) setOpen(true);
    } catch {
      /* private mode / storage disabled — just don't show */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const raw = t("changelog.items", { returnObjects: true });
  const items = (
    Array.isArray(raw) ? raw : []
  ) as { title: string; detail: string }[];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 dark:bg-black/85"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-[#fff0da] shadow-2xl dark:border dark:border-white/10 dark:bg-[#1c1c1c] dark:text-white dark:shadow-[#00000080]">
            <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6">
              <div>
                <div className="text-[22px] font-bold">
                  ✨ {t("changelog.title")}
                </div>
                <div className="text-[13px] opacity-60">
                  {t("changelog.version")}
                </div>
              </div>
              <button
                onClick={dismiss}
                aria-label="Close"
                className="text-[28px] leading-none opacity-70 hover:opacity-100"
              >
                <IoCloseOutline />
              </button>
            </div>

            <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {items.map((it) => (
                <li key={it.title} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffc778]" />
                  <div>
                    <div className="text-[15px] font-semibold leading-5">
                      {it.title}
                    </div>
                    <div className="mt-1 text-[13px] leading-5 opacity-70">
                      <RichText text={it.detail} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="shrink-0 px-6 pb-6 pt-1">
              <button
                onClick={dismiss}
                className="w-full rounded-full bg-[#ffc778] py-2.5 font-bold text-black transition-colors hover:bg-[#ffb84d]"
              >
                {t("changelog.close")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
