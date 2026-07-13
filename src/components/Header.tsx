import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoCloseOutline } from "react-icons/io5";
import { FaInstagram } from "react-icons/fa";
import { PiLinktreeLogoBold } from "react-icons/pi";
import { FiExternalLink } from "react-icons/fi";
import ThemeSwitch from "@/components/ThemeSwitch";

const MEMBER_URL = "https://member.earhousesongwritingclub.com";

const varFadeInOutFullMobile = {
  hidden: { opacity: 0, transition: { duration: 0.2 } },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 1, transition: { duration: 0.2 } },
};

export const Header = () => {
  const { t, i18n } = useTranslation();
  const [showModalAbout, setShowModalAbout] = useState(false);

  return (
    <div className="w-full py-2 shadow-md dark:shadow-[rgba(255,255,255,0.1)]">
      <div className="max-w-[1080px] flex justify-between items-center text-[black] mx-auto px-4">
        <div className="flex items-center">
          <Link to="/" className="text-[16px] font-jakarta-sans">
            <img
              src="/logo-esc.png"
              alt="logo"
              width={100}
              height={100}
              className="dark:invert"
            />
          </Link>
          <nav className="flex ml-10">
            {(
              [
                { to: "/", label: t("nav.objectWriting"), end: true },
                { to: "/check", label: t("nav.check"), end: false },
                { to: "/rhyme", label: t("nav.rhyme"), end: false },
                { to: "/pad", label: t("nav.pad"), end: false },
              ] as const
            ).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `mx-3 pb-1 dark:text-white text-[14px] font-semibold border-b-4 ${
                    isActive
                      ? "border-black dark:border-white"
                      : "border-transparent"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="mx-3 pb-1 border-b-4 border-transparent dark:text-white text-[14px] font-semibold"
            onClick={() => setShowModalAbout(true)}
          >
            About
          </button>
          <a
            href={MEMBER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-[#ffc778] text-black px-4 py-1.5 text-[13px] font-semibold"
          >
            {t("nav.member")}
            <FiExternalLink className="text-[13px]" />
          </a>
        </div>
        <div className="flex items-center pb-1 border-b-4 border-transparent">
          <div className="flex items-center mx-2 gap-1">
            {(["id", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => i18n.changeLanguage(l)}
                className={`text-[12px] font-bold px-2 py-1 rounded ${
                  i18n.language === l
                    ? "bg-[#ffc778] dark:text-black"
                    : "opacity-50 dark:text-white"
                }`}
              >
                {t(`lang.${l}`)}
              </button>
            ))}
          </div>
          <ThemeSwitch />
        </div>
      </div>
      <AnimatePresence>
        {showModalAbout && (
          <motion.div
            variants={varFadeInOutFullMobile}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full p-8 h-screen fixed top-0 left-0 bg-[#000000b0] dark:bg-[#19191970] flex justify-center items-center"
          >
            <div className="w-full max-w-[500px] shadow-lg px-6 py-8 bg-[#fff0da] dark:bg-black dark:text-white rounded-xl text-left dark:shadow-[#c2c2c240]">
              <div className="flex w-full items-center justify-between  mb-6">
                <img
                  src="/logo-esc.png"
                  alt="logo"
                  width={100}
                  height={100}
                  className="dark:invert"
                />
                <button
                  onClick={() => {
                    setShowModalAbout(false);
                  }}
                  className="text-[32px]"
                >
                  <IoCloseOutline />
                </button>
              </div>
              <div className="font-medium text-[32px] leading-none">
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
