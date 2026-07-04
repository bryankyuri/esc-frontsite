import { GiHamburgerMenu } from "react-icons/gi";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { IoCloseOutline } from "react-icons/io5";
import { FaInstagram } from "react-icons/fa";
import { PiLinktreeLogoBold } from "react-icons/pi";
import { BsPinAngleFill } from "react-icons/bs";
import ThemeSwitch from "@/components/ThemeSwitch";

const varFadeInOutMobile = {
  hidden: { opacity: 0, y: "300px" },
  visible: { opacity: 1, y: "0", transition: { duration: 0.2 } },
  exit: { opacity: 1, y: "100%", transition: { duration: 0.2 } },
};

export const HeaderMobile = () => {
  const { t, i18n } = useTranslation();
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useEffect(() => {
    setShowMenu(false);
  }, []);

  return (
    <div className="w-full py-2 shadow-md dark:shadow-[rgba(255,255,255,0.1)] px-6">
      <div className="max-w-[1080px] flex justify-between items-center text-[black] mx-auto">
        <button
          className="dark:text-white text-[18px]"
          onClick={() => setShowMenu(true)}
        >
          <GiHamburgerMenu />
        </button>
        <Link to="/">
          <img
            src="/logo-esc.png"
            alt="logo"
            width={60}
            height={60}
            className="dark:invert"
          />
        </Link>

        <ThemeSwitch />
      </div>
      <AnimatePresence>
        {showMenu && (
          <motion.div
            variants={varFadeInOutMobile}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-screen h-screen bg-[#fceba5] fixed left-0 top-0 z-10 pb-8 pt-2 dark:bg-black overflow-y-auto"
          >
            <div className="flex px-6 items-center justify-between">
              <img
                src="/logo-esc.png"
                alt="logo"
                width={100}
                height={100}
                className="dark:invert"
              />
              <button
                className="dark:text-white text-[48px]"
                onClick={() => setShowMenu(false)}
              >
                <IoCloseOutline />
              </button>
            </div>
            <div className="flex flex-col my-8 px-6">
              <nav className="flex flex-col gap-3 mb-8">
                {(
                  [
                    { to: "/", label: t("nav.objectWriting"), end: true },
                    { to: "/check", label: t("nav.check"), end: false },
                    { to: "/rhyme", label: t("nav.rhyme"), end: false },
                  ] as const
                ).map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setShowMenu(false)}
                    className="text-[22px] font-semibold dark:text-white border-b border-black/20 dark:border-white/20 pb-2 flex items-center justify-between"
                  >
                    {({ isActive }) => (
                      <>
                        {item.label}
                        {isActive && (
                          <BsPinAngleFill className="text-[18px] text-black dark:text-[#ffc778]" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  {(["id", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => i18n.changeLanguage(l)}
                      className={`text-[13px] font-bold px-3 py-1 rounded ${
                        i18n.language === l
                          ? "bg-[#ffc778] dark:text-black"
                          : "opacity-50 dark:text-white border border-black/30 dark:border-white/30"
                      }`}
                    >
                      {t(`lang.${l}`)}
                    </button>
                  ))}
                </div>
              </nav>
              <div className="font-medium text-[32px]">
                {t("about.heading")}
              </div>
              <div className="mt-8 mb-8 leading-6">
                {t("about.para1")} <br />
                <br />
                {t("about.para2")}
              </div>

              <div className="flex flex-col">
                <a
                  href="https://www.instagram.com/earhousesongwritingclub/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center my-2"
                >
                  <div className="mr-2 rounded-full w-[24px] h-[24px] bg-black dark:bg-white dark:text-black flex justify-center items-center text-white">
                    <FaInstagram />
                  </div>{" "}
                  <div className="underline">earhousesongwritingclub</div>
                </a>
                <a
                  href="https://linktr.ee/earhouse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center my-2"
                >
                  <div className="mr-2 rounded-full w-[24px] h-[24px] bg-black dark:bg-white dark:text-black flex justify-center items-center text-white">
                    <PiLinktreeLogoBold />
                  </div>
                  <div className="underline">linktr.ee/earhouse</div>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
