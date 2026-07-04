import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  id: {
    translation: {
      nav: {
        objectWriting: "Object Writing",
        check: "Periksa Ejaan",
        rhyme: "Rima",
      },
      about: {
        heading: "Tentang Earhouse Songwriting Club",
        para1:
          "Earhouse Songwriting Club (ESC) merupakan sebuah komunitas yang terbentuk sejak 2014, diprakarsai oleh duo Endah N Rhesa. Komunitas ini bertujuan untuk mengumpulkan dan mewadahi orang-orang yang tertarik berkreasi, khususnya dalam bidang menulis lagu.",
        para2:
          "ESC dibentuk agar teman-teman semua dapat terwadahi untuk saling bertukar pikiran dan belajar satu sama lain.",
      },
      lang: { id: "ID", en: "EN" },
      rhyme: {
        title: "Pencari Rima & Sinonim",
        subtitle: "Masukkan sebuah kata untuk menemukan rima, sinonim, dan suku kata.",
        placeholder: "Masukkan kata…",
        button: "Cari",
        searching: "Mencari…",
        perfect: "Rima Sempurna",
        near: "Rima Mirip",
        synonyms: "Sinonim",
        syllables: "Suku Kata",
        none: "Tidak ada hasil untuk kata ini.",
        englishSoon:
          "Fitur bahasa Inggris belum tersedia dan masih dalam pengembangan.",
        languageLabel: "Bahasa",
      },
      check: {
        title: "Periksa Ejaan & Tata Bahasa",
        subtitle:
          "Tempel tulisan Anda untuk memeriksa ejaan (KBBI VI) dan tata bahasa.",
        disclaimer:
          "Mendeteksi kesalahan ejaan & tata bahasa yang umum — bukan pengganti penyuntingan yang teliti.",
        placeholder: "Tempel atau ketik teks Anda di sini…",
        button: "Periksa",
        checking: "Memeriksa…",
        clear: "Bersihkan",
        noIssues: "Tidak ada masalah ditemukan. Bagus! 🎉",
        summary: "{{count}} masalah ditemukan",
        spelling: "Ejaan",
        grammar: "Tata Bahasa",
        suggestion: "Saran",
        nonstandard: "tidak baku",
        unknown: "tidak dikenal",
        legendSpelling: "Ejaan",
        legendGrammar: "Tata bahasa",
        englishSoon:
          "Pemeriksaan bahasa Inggris belum tersedia dan masih dalam pengembangan.",
        languageLabel: "Bahasa",
        noSuggestions: "Tidak ada saran",
        apply: "Terapkan",
        langNameId: "Bahasa Indonesia",
        langNameEn: "Bahasa Inggris",
        mismatch:
          "Banyak kata tidak dikenali. Mungkin teks ini berbahasa {{lang}}?",
        switchTo: "Periksa dalam {{lang}}",
      },
      home: {
        englishUnavailable:
          "Kamus bahasa Inggris belum tersedia dan masih dalam pengembangan.",
        instruction: "Instruksi",
        credits: "Kredit",
        instructionText:
          "Setel pengatur waktu selama 10 menit, lalu lakukan menulis bebas (free-writing) berdasarkan \"Word of The Day\" atau \"Random Word Generator\" hingga waktu habis. Manfaatkan ketujuh indra: lima indra utama (penglihatan, perabaan, pendengaran, penciuman, dan pengecapan), ditambah indra organik (kesadaran akan tubuh Anda) serta indra kinestetik (kesadaran akan gerakan dan hubungan spasial Anda dengan dunia sekitar).",
        creditsText:
          "Situs ini kami buat dengan bangga, terinspirasi oleh buku \"Writing Better Lyrics\" karya Pat Pattison dan situs objectwriting.com, sebagai wadah untuk berlatih menulis kreatif.",
        generate: "Acak",
        findInDictionary: "Cari di kamus",
        dict: {
          title: "Kamus Besar Bahasa Indonesia",
          titleEn: "Kamus Bahasa Inggris",
          forms: "Bentuk",
          searchPlaceholder: "Masukkan kata yang ingin dicari...",
          searching: "Mencari...",
          searchButton: "Cari",
          loading: "Mencari kata dalam kamus...",
          error: "Terjadi kesalahan",
          notFound: "Kata tidak ditemukan",
          enterWord: "Masukkan kata untuk mencari",
          tryAnother: "Coba gunakan kata lain atau periksa ejaan",
          kataDasar: "Kata Dasar",
          bentukTidakBaku: "Bentuk Tidak Baku",
          varian: "Varian",
          etimologi: "Etimologi",
          arti: "Arti",
          contoh: "Contoh",
          kataTurunan: "Kata Turunan",
          gabunganKata: "Gabungan Kata",
          peribahasa: "Peribahasa",
          idiom: "Idiom",
          sukuKata: "Suku Kata",
          sinonim: "Sinonim",
          rima: "Rima",
        },
      },
    },
  },
  en: {
    translation: {
      nav: {
        objectWriting: "Object Writing",
        check: "Spell Check",
        rhyme: "Rhymes",
      },
      about: {
        heading: "About Earhouse Songwriting Club",
        para1:
          "Earhouse Songwriting Club (ESC) is a community formed in 2014, initiated by the duo Endah N Rhesa. It exists to gather and support people who love to create — songwriters most of all.",
        para2:
          "ESC was formed so everyone has a space to exchange ideas and learn from one another.",
      },
      lang: { id: "ID", en: "EN" },
      rhyme: {
        title: "Rhyme & Synonym Finder",
        subtitle: "Enter a word to find rhymes, synonyms, and its syllables.",
        placeholder: "Enter a word…",
        button: "Find",
        searching: "Searching…",
        perfect: "Perfect rhymes",
        near: "Near rhymes",
        synonyms: "Synonyms",
        syllables: "Syllables",
        none: "No results for this word.",
        englishSoon:
          "The English feature is not available yet and still under development.",
        languageLabel: "Language",
      },
      check: {
        title: "Spelling & Grammar Check",
        subtitle:
          "Paste your writing to check spelling (WordNet) and grammar.",
        disclaimer:
          "Catches common spelling & grammar mistakes — not a substitute for careful proofreading.",
        placeholder: "Paste or type your text here…",
        button: "Check",
        checking: "Checking…",
        clear: "Clear",
        noIssues: "No issues found. Nice! 🎉",
        summary: "{{count}} issue(s) found",
        spelling: "Spelling",
        grammar: "Grammar",
        suggestion: "Suggestion",
        nonstandard: "non-standard",
        unknown: "unknown",
        legendSpelling: "Spelling",
        legendGrammar: "Grammar",
        englishSoon:
          "English checking is not available yet and still under development.",
        languageLabel: "Language",
        noSuggestions: "No suggestions",
        apply: "Apply",
        langNameId: "Indonesian",
        langNameEn: "English",
        mismatch:
          "Many words weren't recognized. Is this text in {{lang}}?",
        switchTo: "Check in {{lang}}",
      },
      home: {
        englishUnavailable:
          "The English dictionary is not available yet and still under development.",
        instruction: "Instruction",
        credits: "Credits",
        instructionText:
          "Set a timer for 10 minutes and free-write based on the \"Word of The Day\" or \"Random Word Generator\" until the timer finishes. Use all \"seven senses\": the five conventional ones (sight, touch, hearing, smell, and taste), plus the organic sense (awareness of your body) and the kinesthetic sense (awareness of movement and your spatial relation to the outside world).",
        creditsText:
          "This site is proudly inspired by Pat Pattison's book \"Writing Better Lyrics\" and the site objectwriting.com, offering a space to practice creative writing.",
        generate: "Generate",
        findInDictionary: "Find it in dictionary",
        dict: {
          title: "Kamus Besar Bahasa Indonesia",
          titleEn: "English Dictionary",
          forms: "Forms",
          searchPlaceholder: "Enter a word to search...",
          searching: "Searching...",
          searchButton: "Search",
          loading: "Searching the dictionary...",
          error: "An error occurred",
          notFound: "Word not found",
          enterWord: "Enter a word to search",
          tryAnother: "Try another word or check the spelling",
          kataDasar: "Root Word",
          bentukTidakBaku: "Non-standard Form",
          varian: "Variant",
          etimologi: "Etymology",
          arti: "Meaning",
          contoh: "Example",
          kataTurunan: "Derived Words",
          gabunganKata: "Compound Words",
          peribahasa: "Proverbs",
          idiom: "Idioms",
          sukuKata: "Syllables",
          sinonim: "Synonyms",
          rima: "Rhymes",
        },
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "id",
  fallbackLng: "id",
  interpolation: { escapeValue: false },
});

export default i18n;
