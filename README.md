# Earhouse Songwriting Club — Frontsite

The public web app for **Earhouse Songwriting Club (ESC)** — a bilingual
(Indonesian 🇮🇩 / English 🇬🇧) songwriting toolkit built around **Object Writing**.

🔗 **Live:** https://earhousesongwritingclub.com
🔌 **API:** [`dictionary-service`](https://github.com/bryankyuri/dictionary-service) → `https://api-dictionary.earhousesongwritingclub.com`

## Features

- **Object Writing** — "Word of the Day" + random-word prompts and a 10-minute
  timer for sensory free-writing.
- **Dictionary** — in-app lookup: KBBI VI (Indonesian) and Open English WordNet
  (English), with definitions, examples, word class, and etymology.
- **Spell & Grammar check** (`/check`) — spelling (KBBI / WordNet + SymSpell) plus
  grammar (Indonesian PUEBI rules; English via LanguageTool).
- **Rhyme & Synonym finder** (`/rhyme`) — perfect/near rhymes, syllables, and
  synonyms; phonetic (CMUdict) for English, spelling-based for Indonesian.
- **Bilingual UI** — ID/EN toggle (react-i18next); content language follows it.
- **Dark mode**, responsive desktop/mobile layouts.

All language data comes from the backend API — this repo is the frontend only.

## Stack

- **Build:** Vite 5 + `@vitejs/plugin-react`
- **UI:** React 18 + TypeScript 5, `react-router-dom`
- **Styling:** Tailwind CSS 3 (dark mode via `class`)
- **i18n:** `react-i18next`
- **Animation:** `motion` (`motion/react`)
- **Misc:** `@headlessui/react`, `react-icons`, `date-fns`, self-hosted
  `@fontsource` fonts

## Local development

```bash
yarn install
yarn dev          # Vite dev server on http://localhost:3000
```

Point it at a backend via an env file (see `.env.example`):

```dotenv
# .env  — omit to fall back to http://localhost:8002
VITE_API_BASE_URL=https://api-dictionary.earhousesongwritingclub.com
```

Other scripts:

```bash
yarn build        # type-check + production build -> dist/
yarn preview      # preview the production build
yarn lint         # eslint
yarn type-check   # tsc --noEmit
```

## Routes

| Path      | Page                                   |
|-----------|----------------------------------------|
| `/`       | Object Writing (prompts + timer + dictionary modal) |
| `/check`  | Spelling & Grammar check               |
| `/rhyme`  | Rhyme & Synonym finder                 |

## Deployment (Vercel)

Auto-deploys on push to `main`.

- **Framework preset:** Vite · **Build:** `yarn build` · **Output:** `dist`
- **Environment variable:** `VITE_API_BASE_URL` =
  `https://api-dictionary.earhousesongwritingclub.com`
- `vercel.json` rewrites all routes to `index.html` so client-side deep links
  (`/check`, `/rhyme`) work on refresh.

## Structure

```
src/
├── main.tsx              # entry: fonts + globals.css + <App/>
├── App.tsx               # router: / , /check , /rhyme
├── i18n.ts               # ID/EN translation resources
├── pages/
│   ├── Home.tsx          # Object Writing + dictionary modal + toolkit
│   ├── Check.tsx         # spelling & grammar checker
│   └── Rhyme.tsx         # rhyme / synonym / syllable finder
├── components/           # Header, HeaderMobile, ThemeSwitch
├── providers/            # AppContext (screen width) + Providers (theme/header)
└── data/                 # arrayKBBI.js / arrayEN.js (prompt word lists)
```
