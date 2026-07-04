import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Placeholder keeps the same footprint so nothing shifts before hydration.
  if (!mounted) {
    return (
      <div
        className="w-[54px] h-[28px] rounded-full bg-gray-300 dark:bg-white/20"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-[54px] h-[28px] rounded-full transition-colors bg-gray-100 dark:bg-white/20 border dark:border-none"
    >
      <span
        className={`absolute top-[3px] left-[3px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#ffc778] shadow-sm transition-transform duration-200 ${
          isDark ? "translate-x-[26px]" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <FiMoon className="text-[13px] text-black" />
        ) : (
          <FiSun className="text-[13px] text-black" />
        )}
      </span>
    </button>
  );
}
