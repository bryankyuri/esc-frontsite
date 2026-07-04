import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted)
    return (
      <img
        src="data:image/svg+xml;base64,PHN2ZyBzdHJva2U9IiNGRkZGRkYiIGZpbGw9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMCIgdmlld0JveD0iMCAwIDI0IDI0IiBoZWlnaHQ9IjIwMHB4IiB3aWR0aD0iMjAwcHgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiB4PSIyIiB5PSIyIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjIiIHJ4PSIyIj48L3JlY3Q+PC9zdmc+Cg=="
        width={36}
        height={36}
        alt="Loading Light/Dark Toggle"
        title="Loading Light/Dark Toggle"
      />
    );

  if (resolvedTheme === "dark") {
    return (
      <button
        onClick={() => setTheme("light")}
        className="flex dark:bg-[#ffc778] lg:rounded-[25px] lg:py-[8px] lg:px-[12px] rounded-full p-2 items-center"
      >
        <FiSun />
      </button>
    );
  }

  if (resolvedTheme === "light") {
    return (
      <button
        onClick={() => setTheme("dark")}
        className="flex bg-[#121212] text-white lg:rounded-[25px] lg:py-[8px] lg:px-[12px] rounded-full p-2 items-center"
      >
        <FiMoon />
      </button>
    );
  }
}
