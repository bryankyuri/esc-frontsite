import { IoIosArrowDropdown, IoMdCheckmarkCircleOutline } from "react-icons/io";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useCallback, useContext, useEffect, useState } from "react";
import { LuAlarmClock } from "react-icons/lu";
import { GrInfo } from "react-icons/gr";
import { motion, AnimatePresence } from "motion/react";
import { IoCloseOutline, IoSearch } from "react-icons/io5";
import { format, differenceInDays } from "date-fns";
import { GoArrowUpRight } from "react-icons/go";
import { GiPerspectiveDiceSixFacesRandom } from "react-icons/gi";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AppContext } from "@/providers/AppContext";
import { dataKBBI } from "@/data/arrayKBBI";
import { dataEN } from "@/data/arrayEN";
import {
  rhymeOptions,
  searchOptions,
  syllableOptions,
  thesaurusOptions,
} from "@/lib/dictionaryApi";

// KBBI API base URL — configurable via .env (VITE_API_BASE_URL).
// Defaults to the local service_api (see ../../service_api).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8002";

// KBBI API Interfaces
interface KbbiMeaning {
  id: number;
  kbbi_entry_id: number;
  kelas:
    | string
    | Array<{
        kode: string;
        nama: string;
        deskripsi: string;
      }>;
  submakna: string | string[];
  info: string;
  contoh: string | string[];
  created_at: string;
  updated_at: string;
}

interface KbbiEntry {
  id: number;
  // `lema` is returned by the remote API; the local service_api uses `nama`/`keyword`.
  lema?: string;
  nama?: string;
  keyword?: string;
  kata_dasar: string[];
  bentuk_tidak_baku: string[];
  varian: string[];
  etimologi?:
    | string
    | { bahasa?: string; asal_kata?: string; pelafalan?: string; arti?: string[] }
    | null;
  meanings: KbbiMeaning[];
  kata_turunan: string[];
  gabungan_kata: string[];
  peribahasa: string[];
  idiom: string[];
  created_at: string;
  updated_at: string;
}

interface KbbiApiResponse {
  status: "success" | "error";
  data: KbbiEntry[];
  error?: boolean;
  message?: string;
}

// English dictionary (Open English WordNet) — a different shape from KBBI.
interface EnglishMeaningApi {
  id: number;
  gloss: string;
  examples: string[];
  synonyms: string[];
}
interface EnglishEntryApi {
  id: number;
  word: string;
  display: string;
  pos: string;
  pos_label: string;
  pronunciation: string | null;
  forms: string[];
  synonyms: string[];
  etymology: string | null;
  meanings: EnglishMeaningApi[];
}
interface EnglishApiResponse {
  status: "success" | "error";
  data: EnglishEntryApi[];
  error?: boolean;
  message?: string;
}

// The word to display for an entry, tolerant of both API schemas.
const entryLema = (entry: KbbiEntry): string =>
  entry.lema || entry.nama || entry.keyword || "";

// Helper function to safely parse JSON arrays
const parseJsonArray = (field: string | string[]): string[] => {
  if (Array.isArray(field)) {
    return field;
  }
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Helper function to safely parse kelas field
const parseKelasArray = (
  field:
    | string
    | Array<{
        kode: string;
        nama: string;
        deskripsi: string;
      }>
): Array<{
  kode: string;
  nama: string;
  deskripsi: string;
}> => {
  if (Array.isArray(field)) {
    return field;
  }
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const varFadeInOutFullMobile = {
  hidden: { opacity: 0, transition: { duration: 0.2 } },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 1, transition: { duration: 0.2 } },
};

export default function Home() {
  const queryClient = useQueryClient();
  const START_MINUTES = "10";
  const START_SECOND = "00";
  const START_DURATION = 10;
  const [language, setLanguage] = useState("Indonesian");
  const [type, setType] = useState(1);
  const [currentMinutes, setMinutes] = useState(START_MINUTES);
  const [currentSeconds, setSeconds] = useState(START_SECOND);
  const [isStop, setIsStop] = useState(false);
  const [duration, setDuration] = useState<number>(START_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [wodId, setWodId] = useState("");
  const [wodEn, setWodEn] = useState("");
  const [randomId, setRandomId] = useState("");
  const [randomEn, setRandomEn] = useState("");
  const [infoType, setInfoType] = useState(1);

  const [showModalInstruction, setShowModalInstruction] = useState(false);
  const [showModalCredits, setShowModalCredits] = useState(false);

  const { t, i18n } = useTranslation();

  // Follow the header ID/EN toggle so the dictionary/WOD language matches the UI.
  useEffect(() => {
    setLanguage(i18n.language === "en" ? "English" : "Indonesian");
  }, [i18n.language]);

  // Dictionary modal state
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [dictionarySearchTerm, setDictionarySearchTerm] = useState("");
  const [dictionaryData, setDictionaryData] = useState<KbbiApiResponse>({
    status: "success",
    data: [],
  });
  const [englishData, setEnglishData] = useState<EnglishApiResponse>({
    status: "success",
    data: [],
  });
  const [isLoadingDictionary, setIsLoadingDictionary] = useState(false);
  const [isDirectWordLookup, setIsDirectWordLookup] = useState(false);
  const [toolkit, setToolkit] = useState<{
    syllables: string[];
    synonyms: string[];
    rhymes: string[];
  } | null>(null);

  const { screenWidth } = useContext(AppContext);
  const isDesktop = screenWidth > 1080;

  const shuffle = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const generateRandom = useCallback((array: string[]) => {
    const shuffledArray = shuffle(array);
    return shuffledArray[0];
  }, []);

  const generateNew = () => {
    if (language === "Indonesian") {
      setRandomId(generateRandom(dataKBBI()));
    } else {
      setRandomEn(generateRandom(dataEN()));
    }
  };

  useEffect(() => {
    const firstday = new Date("2024-05-16");
    const today = new Date(format(new Date(), "yyyy-MM-dd"));
    const difDay = differenceInDays(today, firstday);
    const arrayId = dataKBBI();
    const arrayEn = dataEN();
    setWodId(arrayId[difDay]);
    setWodEn(arrayEn[difDay]);
    setRandomId(generateRandom(arrayId));
    setRandomEn(generateRandom(arrayEn));
    setShowModalInstruction(false);
  }, [generateRandom]);

  const startHandler = () => {
    setDuration(parseInt(START_SECOND, 10) + 60 * parseInt(START_MINUTES, 10));
    setIsRunning(true);
  };
  const stopHandler = () => {
    setIsStop(true);
    setIsRunning(false);
  };
  const resetHandler = () => {
    setMinutes(START_MINUTES);
    setSeconds(START_SECOND);
    setIsRunning(false);
    setIsStop(false);
    setDuration(START_DURATION);
  };

  const resumeHandler = () => {
    const newDuration =
      parseInt(currentMinutes, 10) * 60 + parseInt(currentSeconds, 10);
    setDuration(newDuration);

    setIsRunning(true);
    setIsStop(false);
  };

  // Dictionary search function
  const fetchDictionaryData = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setIsLoadingDictionary(true);
    setToolkit(null);
    const isEn = language === "English";
    const lang = isEn ? "en" : "id";
    const word = searchTerm.trim();
    try {
      // Routed through the TanStack cache — repeat lookups (and words already
      // seen on the Rhyme page) resolve instantly with no network call.
      const [dict, syl, th, rhy] = await Promise.all([
        queryClient.fetchQuery(searchOptions(lang, word)),
        queryClient.fetchQuery(syllableOptions(lang, word)),
        queryClient.fetchQuery(thesaurusOptions(lang, word)),
        queryClient.fetchQuery(rhymeOptions(lang, word, 24)),
      ]);
      if (isEn) {
        setEnglishData(dict as EnglishApiResponse);
      } else {
        setDictionaryData(dict as KbbiApiResponse);
      }
      const sylD = syl as { data?: { syllables?: string[] } };
      const thD = th as { data?: { synonyms?: string[] } };
      const rhyD = rhy as { data?: { perfect?: string[] } };
      setToolkit({
        syllables: sylD?.data?.syllables ?? [],
        synonyms: thD?.data?.synonyms ?? [],
        rhymes: rhyD?.data?.perfect ?? [],
      });
    } catch (error) {
      const errResp = {
        status: "error" as const,
        data: [],
        error: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch dictionary data",
      };
      if (isEn) setEnglishData(errResp);
      else setDictionaryData(errResp);
      setToolkit(null);
    } finally {
      setIsLoadingDictionary(false);
    }
  };

  // Look up a related word (synonym/rhyme) inside the modal.
  const lookupWord = (word: string) => {
    setDictionarySearchTerm(word);
    setIsDirectWordLookup(true);
    fetchDictionaryData(word);
  };

  const handleDictionarySearch = () => {
    if (dictionarySearchTerm.trim()) {
      fetchDictionaryData(dictionarySearchTerm.trim());
    }
  };

  useEffect(() => {
    if (isRunning === true) {
      let timer: number = duration;
      let minutes: number | string;
      let seconds: number | string;
      const interval = setInterval(function () {
        if (--timer <= 0) {
          resetHandler();
        } else {
          const newMinute = (timer / 60).toString();
          const newSecond = (timer % 60).toString();
          minutes = parseInt(newMinute, 10);
          seconds = parseInt(newSecond, 10);

          minutes = minutes < 10 ? "0" + minutes : minutes;
          seconds = seconds < 10 ? "0" + seconds : seconds;

          setMinutes(`${minutes}`);
          setSeconds(`${seconds}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [duration, isRunning]);

  // Manage body overflow when modals are open
  useEffect(() => {
    const isAnyModalOpen =
      showDictionaryModal || showModalInstruction || showModalCredits;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showDictionaryModal, showModalInstruction, showModalCredits]);

  const wordContent =
    type === 1
      ? language === "Indonesian"
        ? wodId
        : wodEn
      : language === "Indonesian"
      ? randomId
      : randomEn;

  // Which dictionary is showing in the modal (drives status/empty checks + render).
  const isEnglishDict = language === "English";
  const activeDict = isEnglishDict ? englishData : dictionaryData;
  return (
    <div
      className={`${
        isDesktop ? "" : "px-4"
      } flex min-h-screen flex-col items-center justify-start`}
    >
      <div
        className={`${
          isDesktop
            ? "h-[120px] mt-[48px] py-4 px-8 rounded-lg"
            : "mt-[24px] py-2 px-4 rounded-lg"
        } flex items-center w-full shadow-sm max-w-[1080px] bg-[#ffc778] dark:bg-[#000] dark:shadow-[#c2c2c210]`}
      >
        <div
          className={`w-full flex justify-between items-center dark:text-white`}
        >
          <div
            className={`${isDesktop ? "text-[42px]" : "text-[18px]"} font-bold`}
          >
            Object Writing
          </div>
          <div className="flex ">
            <Menu>
              <MenuButton
                className={`py-3 ml-4 leading-none flex font-semibold justify-between items-center ${
                  isDesktop ? "min-w-[234px]" : "min-w-[155px] text-[11px]"
                }`}
              >
                <div className={`${isDesktop ? "w-[110px]" : "w-[70px]"} `}>
                  Language :{" "}
                </div>

                <div
                  className={`flex justify-between items-center ${
                    isDesktop ? "w-[124px]" : "w-[85px]"
                  }`}
                >
                  {language}{" "}
                  <IoIosArrowDropdown
                    strokeWidth={4}
                    className={`ml-2 ${
                      isDesktop ? "text-[18px]" : "text-[14px]"
                    }`}
                  />
                </div>
              </MenuButton>
              <MenuItems
                anchor="bottom"
                className={`bg-[#f7e8d3] dark:bg-[#414141] text-left ${
                  isDesktop ? "w-[200px] p-4" : "w-[160px] text-[11px] py-2"
                } rounded-lg shadow-lg font-medium dark:shadow-[#c2c2c210]`}
              >
                <MenuItem>
                  <button
                    onClick={() => {
                      if (language !== "English") setLanguage("English");
                    }}
                    className="block w-full text-left data-[focus]:bg-[#ffc778] dark:data-[focus]:bg-black py-2 px-3 rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      English{" "}
                      {language === "English" ? (
                        <IoMdCheckmarkCircleOutline />
                      ) : (
                        ""
                      )}
                    </div>
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={() => {
                      if (language !== "Indonesian") setLanguage("Indonesian");
                    }}
                    className="block w-full text-left data-[focus]:bg-[#ffc778] dark:data-[focus]:bg-black py-2 px-3 rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      Indonesian{" "}
                      {language === "Indonesian" ? (
                        <IoMdCheckmarkCircleOutline />
                      ) : (
                        ""
                      )}
                    </div>
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>

            {/* <div className=""></div> */}
          </div>
        </div>
      </div>

      {!isDesktop && (
        <div className="w-full flex justify-end px-2">
          <button
            className="flex items-center mt-6 mb-2 text-[12px] font-bold"
            onClick={() => {
              setShowModalInstruction(true);
            }}
          >
            <div className="w-[24px] h-[24px] mr-2 flex justify-center items-center rounded-full bg-[#ffc778] dark:text-black">
              <GrInfo className="ml-[-1px]" strokeWidth={4} />
            </div>
            <div className="border-b-2 border-black pb-1 dark:border-white">
              {t("home.instruction")}
            </div>
          </button>
          <button
            className="flex items-center mt-6 mb-2 text-[12px] font-bold"
            onClick={() => {
              setShowModalCredits(true);
            }}
          >
            <div className="w-[24px] h-[24px] mr-2 ml-8 flex justify-center items-center rounded-full font-bold bg-[#ffc778] dark:text-black">
              C
            </div>
            <div className="border-b-2 border-black pb-1 dark:border-white">
              {t("home.credits")}
            </div>
          </button>
        </div>
      )}

      <div
        className={`flex w-full ${
          isDesktop
            ? "h-[435px] max-w-[1080px] items-center mt-[24px] mb-[24px]"
            : "flex-col mt-[12px] mb-[12px]"
        } `}
      >
        <div
          className={`${
            isDesktop ? "mr-4 h-full p-12" : "mb-6 px-4 py-6 text-[11px]"
          } shadow-lg w-full bg-[#fceba5] border-1 dark:bg-[#000]  rounded-lg dark:shadow-[#c2c2c210]`}
        >
          <div className="w-full flex flex-col">
            <div className="w-full flex font-medium">
              <button
                onClick={() => {
                  if (type !== 1) setType(1);
                }}
                className={`mr-4 rounded-full ${
                  type === 1
                    ? "bg-black text-white dark:bg-[#fff] dark:text-black "
                    : "border-2 border-black text-black dark:text-white dark:border-white"
                }  ${isDesktop ? "px-5 py-3" : "p-3"} leading-none`}
              >
                Word of The Day
              </button>
              <button
                onClick={() => {
                  if (type !== 2) setType(2);
                }}
                className={`${
                  type !== 1
                    ? "bg-black text-white dark:bg-[#fff] dark:text-black "
                    : "border-2 border-black text-black dark:text-white dark:border-white"
                } rounded-full  ${
                  isDesktop ? "px-5 py-3" : "p-3"
                }  leading-none`}
              >
                Random Word Generator
              </button>
            </div>
            <div
              className={`${
                isDesktop
                  ? "text-[48px] min-h-[270px]"
                  : "text-[36px] min-h-[250px]"
              }  font-bold  w-full flex items-center justify-center text-center italic`}
            >
              <div className=" underline pb-2 border-black dark:border-white px-1">
                {wordContent}
              </div>
            </div>
            <div className="w-ful flex items center justify-between text-[16px]">
              <div>
                {type === 2 && (
                  <button
                    onClick={() => {
                      generateNew();
                    }}
                    className={`rounded-full py-1 pr-3 pl-2 bg-[#ffc778] dark:text-black font-bold ${
                      isDesktop ? "text-[14px]" : "text-[12px]"
                    } flex items-center`}
                  >
                    <GiPerspectiveDiceSixFacesRandom
                      className={`mr-1 ${
                        isDesktop ? "text-[32px]" : "text-[28px]"
                      }`}
                    />
                    {t("home.generate")}
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setDictionarySearchTerm(wordContent);
                  setIsDirectWordLookup(true);
                  setShowDictionaryModal(true);
                  fetchDictionaryData(wordContent);
                }}
                className="italic underline flex items-center"
              >
                <div className="w-[24px] h-[24px] mr-2 flex text-[16px] justify-center items-center rounded-full bg-[#ffc778] dark:text-black">
                  <IoSearch className="ml-[2px]" strokeWidth={4} />
                </div>
                <div
                  className={`font-semibold ${
                    isDesktop ? "text-[14px]" : "text-[11px]"
                  }`}
                >
                  {t("home.findInDictionary")}
                </div>
                <GoArrowUpRight className="ml-1" />
              </button>
            </div>
          </div>
        </div>
        <div
          className={`${
            isDesktop ? "w-full max-w-[400px] py-4 px-8 " : "w-full px-4 py-6"
          } shadow-lg  bg-[#faebd7] dark:bg-[#000] rounded-lg h-full flex flex-col justify-center items-center dark:shadow-[#c2c2c210]`}
        >
          <div
            className={`${
              isDesktop ? "text-[32px]" : "text-[24px]"
            } text-center font-bold flex items-center justify-center`}
          >
            <LuAlarmClock className="mr-4" /> Timer
          </div>
          <div
            className={`time w-full flex justify-center ${
              isDesktop ? "mt-[36px]" : "mt-[24px]"
            }`}
          >
            <div
              className={`flex justify-center items-center bg-black dark:bg-[#121212] text-white ${
                isDesktop
                  ? "text-[86px] w-[130px]"
                  : "text-[60px] w-[100px] h-[100px]"
              } text-center rounded-lg`}
            >
              {currentMinutes}
            </div>
            <span
              className={`mx-3 ${isDesktop ? "text-[86px]" : "text-[60px]"}`}
            >
              :
            </span>
            <div
              className={`flex justify-center items-center bg-black dark:bg-[#121212] text-white ${
                isDesktop
                  ? "text-[86px] w-[130px]"
                  : "text-[60px] w-[100px] h-[100px]"
              } text-center rounded-lg`}
            >
              {currentSeconds}
            </div>
          </div>
          <div
            className={`flex ${
              isDesktop ? "mt-[48px]" : "mt-[24px]"
            } w-full justify-center `}
          >
            <div>
              {!isRunning && !isStop && (
                <button
                  onClick={startHandler}
                  className={`border-black dark:border-white border-2 bg-black text-white dark:bg-white dark:text-black ${
                    isDesktop
                      ? "px-4 py-2 w-[100px]"
                      : "text-[14px] px-3 py-1 w-[85px]"
                  } font-semibold rounded-full`}
                >
                  START
                </button>
              )}
              {isRunning && (
                <button
                  onClick={stopHandler}
                  className={`border-black dark:border-white border-2 bg-black text-white dark:bg-white dark:text-black ${
                    isDesktop
                      ? "px-4 py-2 w-[100px]"
                      : "text-[14px] px-3 py-1 w-[85px]"
                  } font-semibold rounded-full`}
                >
                  STOP
                </button>
              )}

              {isStop && (
                <button
                  onClick={resumeHandler}
                  className={`border-black dark:border-white border-2 bg-black text-white dark:bg-white dark:text-black ${
                    isDesktop
                      ? "px-4 py-2 w-[100px]"
                      : "text-[14px] px-3 py-1 w-[85px]"
                  } font-semibold rounded-full`}
                >
                  RESUME
                </button>
              )}
            </div>
            <div className="w-[32px]"></div>
            <button
              onClick={resetHandler}
              disabled={!isRunning && !isStop}
              className={`border-black text-black dark:border-white dark:text-white border-2 ${
                isDesktop
                  ? "px-4 py-2 w-[100px]"
                  : "text-[14px] px-3 py-1 w-[85px]"
              } rounded-full `}
            >
              RESET
            </button>
          </div>
        </div>
      </div>
      {isDesktop && (
        <div className="w-full shadow-sm max-w-[1080px] bg-[#fff0da] dark:bg-[#000] mb-[24px] py-8 px-8 text-[14px] rounded-lg text-justify dark:shadow-[#c2c2c210]">
          <div className="flex">
            <button
              className="flex mb-6 items-center"
              onClick={() => setInfoType(1)}
            >
              <div className="w-[32px] h-[32px] mr-2 flex text-[20px] justify-center items-center rounded-full bg-[#ffc778] dark:text-black">
                <GrInfo className="ml-[2px]" strokeWidth={4} />
              </div>
              <div
                className={`${
                  infoType === 1 ? "border-b-2" : ""
                } border-black pb-1 font-bold dark:border-white`}
              >
                {t("home.instruction")}
              </div>
            </button>
            <button
              className="flex mb-6 items-center ml-8"
              onClick={() => setInfoType(2)}
            >
              <div className="w-[32px] h-[32px] mr-2 flex text-[20px] font-bold justify-center items-center rounded-full bg-[#ffc778] dark:text-black">
                C
              </div>
              <div
                className={`${
                  infoType === 2 ? "border-b-2" : ""
                } border-black pb-1 font-bold dark:border-white`}
              >
                {t("home.credits")}
              </div>
            </button>
          </div>
          {infoType === 1 ? (
            <div className="italic leading-6">{t("home.instructionText")}</div>
          ) : (
            <div className="italic leading-6">{t("home.creditsText")}</div>
          )}
        </div>
      )}
      <AnimatePresence>
        {!isDesktop && showModalInstruction && (
          <motion.div
            variants={varFadeInOutFullMobile}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full p-8 h-screen fixed top-0 left-0 bg-[#000000b0] dark:bg-[#19191970] flex justify-center items-center"
          >
            <div className="w-full shadow-lg px-6 py-8 bg-[#fff0da] dark:bg-black dark:text-white rounded-xl text-[12px] leading-[20px] text-justify dark:shadow-[#c2c2c240]">
              <div className="flex w-full items-center justify-between  mb-6">
                <div className="flex">
                  <div className="w-[24px] h-[24px] mr-2 flex justify-center items-center rounded-full bg-[#ffc778] dark:text-black">
                    <GrInfo className="ml-[-1px]" strokeWidth={4} />
                  </div>
                  <div className="border-b-2 border-black pb-1underline pb-1 font-bold dark:border-white">
                    {t("home.instruction")}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModalInstruction(false);
                  }}
                  className="text-[32px]"
                >
                  <IoCloseOutline />
                </button>
              </div>
              <div className="italic leading-6">{t("home.instructionText")}</div>
            </div>
          </motion.div>
        )}

        {!isDesktop && showModalCredits && (
          <motion.div
            variants={varFadeInOutFullMobile}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full p-8 h-screen fixed top-0 left-0 bg-[#000000b0] dark:bg-[#19191970] flex justify-center items-center"
          >
            <div className="w-full shadow-lg px-6 py-8 bg-[#fff0da] dark:bg-black dark:text-white rounded-xl text-[12px] leading-[20px] text-justify dark:shadow-[#c2c2c240]">
              <div className="flex w-full items-center justify-between  mb-6">
                <div className="flex">
                  <div className="w-[24px] h-[24px] mr-2 font-bold flex justify-center items-center rounded-full bg-[#ffc778] dark:text-black">
                    C
                  </div>
                  <div className="border-b-2 border-black pb-1underline pb-1 font-bold dark:border-white">
                    {t("home.credits")}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModalCredits(false);
                  }}
                  className="text-[32px]"
                >
                  <IoCloseOutline />
                </button>
              </div>
              <div className="italic leading-6">{t("home.creditsText")}</div>
            </div>
          </motion.div>
        )}

        {/* Dictionary Modal */}
        {showDictionaryModal && (
          <motion.div
            variants={varFadeInOutFullMobile}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full p-4 h-screen fixed top-0 left-0 bg-[#000000b0] dark:bg-[#19191970] flex justify-center items-center z-50 overflow-hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDictionaryModal(false);
                setDictionaryData({ status: "success", data: [] });
                setDictionarySearchTerm("");
                setIsDirectWordLookup(false);
              }
            }}
          >
            <div
              className={`shadow-lg bg-[#fff0da] dark:bg-black dark:text-white rounded-xl dark:shadow-[#c2c2c240] ${
                isDesktop ? "w-[800px] max-h-[90vh]" : "w-full max-h-[90vh]"
              } flex flex-col overflow-hidden`}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {/* Header - Fixed at top */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📖</div>
                  <h2 className="text-xl font-bold">
                    {isEnglishDict ? t("home.dict.titleEn") : t("home.dict.title")}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowDictionaryModal(false);
                    setDictionaryData({ status: "success", data: [] });
                    setDictionarySearchTerm("");
                    setIsDirectWordLookup(false);
                  }}
                  className="text-2xl hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-2 transition-colors"
                >
                  <IoCloseOutline />
                </button>
              </div>

              {/* Search Term Display - Fixed */}
              <div className="p-6 underline border-black dark:border-white px-1 text-[28px] font-bold w-full flex items-center justify-center text-center italic flex-shrink-0">
                {dictionarySearchTerm}
              </div>

              {/* Search Input - Fixed (only show if not direct word lookup) */}
              {!isDirectWordLookup && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={dictionarySearchTerm}
                        onChange={(e) =>
                          setDictionarySearchTerm(e.target.value)
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleDictionarySearch()
                        }
                        placeholder={t("home.dict.searchPlaceholder")}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc778] focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleDictionarySearch}
                      disabled={
                        isLoadingDictionary || !dictionarySearchTerm.trim()
                      }
                      className="px-6 py-3 bg-[#ffc778] hover:bg-[#ffb84d] disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <IoSearch className="text-lg" />
                      {isLoadingDictionary
                        ? t("home.dict.searching")
                        : t("home.dict.searchButton")}
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Content Area */}
              {/* Extra bottom padding on mobile so the last content clears the
                  browser's bottom navigation bar. */}
              <div
                className={`flex-1 overflow-y-auto ${
                  isDesktop ? "" : "pb-28"
                }`}
              >
                {isLoadingDictionary ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffc778] mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {t("home.dict.loading")}
                      </p>
                    </div>
                  </div>
                ) : activeDict.status === "error" ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="text-center">
                      <p className="text-red-600 dark:text-red-400 mb-2">
                        {t("home.dict.error")}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activeDict.message}
                      </p>
                    </div>
                  </div>
                ) : activeDict.data.length === 0 ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {dictionarySearchTerm
                          ? t("home.dict.notFound")
                          : t("home.dict.enterWord")}
                      </p>
                      {dictionarySearchTerm && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {t("home.dict.tryAnother")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : isEnglishDict ? (
                  <div className="p-6">
                    {englishData.data.map((entry) => (
                      <div
                        key={entry.id}
                        className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0"
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
                ) : (
                  <div className="p-6">
                    {dictionaryData.data.map((entry) => (
                      <div
                        key={entry.id}
                        className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0"
                      >
                        {/* Main Word */}
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                          {entryLema(entry)}
                        </h2>

                        {/* Additional Info */}
                        <div className="space-y-2 mb-4 text-sm">
                          {entry.kata_dasar &&
                            parseJsonArray(entry.kata_dasar).length > 0 && (
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {t("home.dict.kataDasar")}:{" "}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {parseJsonArray(entry.kata_dasar).join(", ")}
                                </span>
                              </div>
                            )}

                          {entry.bentuk_tidak_baku &&
                            parseJsonArray(entry.bentuk_tidak_baku).length >
                              0 && (
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {t("home.dict.bentukTidakBaku")}:{" "}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {parseJsonArray(entry.bentuk_tidak_baku).join(
                                    ", "
                                  )}
                                </span>
                              </div>
                            )}

                          {entry.varian &&
                            parseJsonArray(entry.varian).length > 0 && (
                              <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {t("home.dict.varian")}:{" "}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {parseJsonArray(entry.varian).join(", ")}
                                </span>
                              </div>
                            )}

                          {entry.etimologi && (
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {t("home.dict.etimologi")}:{" "}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {typeof entry.etimologi === "string"
                                  ? entry.etimologi
                                  : [
                                      entry.etimologi?.bahasa,
                                      entry.etimologi?.asal_kata,
                                      entry.etimologi?.arti?.join(", "),
                                    ]
                                      .filter(Boolean)
                                      .join(" — ")}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Meanings */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                            {t("home.dict.arti")}:
                          </h3>
                          {entry.meanings.map((meaning, meaningIndex) => (
                            <div
                              key={meaning.id}
                              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                            >
                              {/* Word Class */}
                              {meaning.kelas &&
                                parseKelasArray(meaning.kelas).length > 0 && (
                                  <div className="mb-2">
                                    {parseKelasArray(meaning.kelas).map(
                                      (kelas, kelasIndex) => (
                                        <span
                                          key={kelasIndex}
                                          className="inline-block bg-[#ffc778] text-black text-xs px-2 py-1 rounded-full mr-2 font-medium"
                                        >
                                          {typeof kelas === "string"
                                            ? kelas
                                            : `${kelas.nama} (${kelas.kode})`}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}

                              {/* Definition */}
                              <div className="mb-3 text-sm">
                                <span className="text-gray-900 dark:text-gray-100">
                                  {meaningIndex + 1}.{" "}
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

                              {/* Examples */}
                              {meaning.contoh &&
                                parseJsonArray(meaning.contoh).length > 0 && (
                                  <div className="mt-3">
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                      {t("home.dict.contoh")}:
                                    </span>
                                    <div className="mt-1 space-y-1">
                                      {parseJsonArray(meaning.contoh).map(
                                        (example, exampleIndex) => (
                                          <div
                                            key={exampleIndex}
                                            className="text-sm text-gray-600 dark:text-gray-400 italic"
                                          >
                                            • {example}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>

                        {/* Additional Sections */}
                        {((entry.kata_turunan &&
                          parseJsonArray(entry.kata_turunan).length > 0) ||
                          (entry.gabungan_kata &&
                            parseJsonArray(entry.gabungan_kata).length > 0) ||
                          (entry.peribahasa &&
                            parseJsonArray(entry.peribahasa).length > 0) ||
                          (entry.idiom &&
                            parseJsonArray(entry.idiom).length > 0)) && (
                          <div className="mt-6 space-y-3 text-sm">
                            {entry.kata_turunan &&
                              parseJsonArray(entry.kata_turunan).length > 0 && (
                                <div>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {t("home.dict.kataTurunan")}:{" "}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {parseJsonArray(entry.kata_turunan).join(
                                      ", "
                                    )}
                                  </span>
                                </div>
                              )}

                            {entry.gabungan_kata &&
                              parseJsonArray(entry.gabungan_kata).length > 0 && (
                                <div>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {t("home.dict.gabunganKata")}:{" "}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {parseJsonArray(entry.gabungan_kata).join(
                                      ", "
                                    )}
                                  </span>
                                </div>
                              )}

                            {entry.peribahasa &&
                              parseJsonArray(entry.peribahasa).length > 0 && (
                                <div>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {t("home.dict.peribahasa")}:{" "}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {parseJsonArray(entry.peribahasa).join(", ")}
                                  </span>
                                </div>
                              )}

                            {entry.idiom &&
                              parseJsonArray(entry.idiom).length > 0 && (
                                <div>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    {t("home.dict.idiom")}:{" "}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {parseJsonArray(entry.idiom).join(", ")}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Songwriting toolkit: syllable + synonyms + rhymes */}
                {toolkit &&
                  (toolkit.syllables.length > 0 ||
                    toolkit.synonyms.length > 0 ||
                    toolkit.rhymes.length > 0) && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6 space-y-4">
                      {toolkit.syllables.length > 0 && (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {t("home.dict.sukuKata")}:{" "}
                          </span>
                          <span className="text-gray-800 dark:text-gray-200">
                            {toolkit.syllables.join(" · ")}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {" "}
                            ({toolkit.syllables.length})
                          </span>
                        </div>
                      )}
                      {toolkit.synonyms.length > 0 && (
                        <div>
                          <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2">
                            {t("home.dict.sinonim")}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {toolkit.synonyms.slice(0, 30).map((s) => (
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
                      {toolkit.rhymes.length > 0 && (
                        <div>
                          <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2">
                            {t("home.dict.rima")}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {toolkit.rhymes.slice(0, 24).map((s) => (
                              <button
                                key={s}
                                onClick={() => lookupWord(s)}
                                className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-[13px] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
