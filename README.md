# frontend-public-revamp

Vite + React + TypeScript rebuild of the ESC "Object Writing" public site,
ported from the Next.js app in [`../esc-front-existing`](../esc-front-existing)
and wired to the KBBI [`../service_api`](../service_api).

See [`../SDD.md`](../SDD.md) for the migration design & rationale.

## Stack

- **Build:** Vite 5 + `@vitejs/plugin-react`
- **UI:** React 18 + TypeScript 5
- **Styling:** Tailwind CSS 3 + PostCSS (dark mode via `class` + `next-themes`)
- **Fonts:** self-hosted `@fontsource/poppins` + `@fontsource-variable/plus-jakarta-sans`
- **Animation:** `motion` (`motion/react`) — same package the reference uses
- **Misc:** @headlessui/react, react-icons, date-fns

## Scripts

```bash
yarn install      # install dependencies
yarn dev          # start Vite dev server (http://localhost:3000)
yarn build        # type-check + production build to dist/
yarn preview      # preview the production build
yarn lint         # eslint
yarn type-check
```

## API integration

The **"Find it in dictionary"** button (Indonesian) opens an in-app modal that
fetches definitions from the KBBI service API's `GET /api/kbbi/search?keyword=`
endpoint. The base URL is configurable:

```dotenv
# .env
VITE_API_BASE_URL=http://localhost:8001          # local ../service_api (default)
# VITE_API_BASE_URL=https://api-esc.vloodplein.com  # remote/production API
```

To run the full stack locally: start the API (`cd ../service_api && php artisan
serve --port=8001`), then `yarn dev` here. The API already sends
`Access-Control-Allow-Origin: *`, so cross-origin calls work out of the box.

The modal tolerates both API schemas — it displays `lema` (remote) or falls back
to `nama` / `keyword` (local `service_api`), and parses fields that arrive as
either arrays or JSON strings. English words still open the external Oxford
dictionary in a new tab.

## What changed vs. `esc-front-existing` (Next.js)

- App Router (`app/layout.tsx` + `app/page.tsx`) → SPA entry: `index.html` → `src/main.tsx` → `src/App.tsx`.
- `next/font/google` → self-hosted `@fontsource` packages (imported in `src/main.tsx`).
- `next/image` → native `<img>`; `next/link` → native `<a>`.
- `metadata` export → `<title>`/`<meta>` in `index.html`.
- Hardcoded dictionary API URL → `VITE_API_BASE_URL` env var.
- Removed `"use client"` directives and `next.config.mjs`.
- **Font fix:** the earlier revamp (based on `frontsite`) inherited a
  `body { font-family: "Helvetica Neue" !important }` rule that overrode Poppins.
  This build uses `esc-front-existing`'s simpler `globals.css`, so Poppins renders.

## Structure

```
src/
├── main.tsx              # entry: fonts + globals.css + <App/>
├── App.tsx               # AppProvider > Providers > Home
├── globals.css           # Tailwind + theme/font CSS vars
├── pages/Home.tsx        # Object Writing tool + KBBI dictionary modal (API)
├── providers/
│   ├── AppContext.tsx    # screen-width context
│   └── Providers.tsx     # theme provider + device-type gate + header
├── components/
│   ├── Header.tsx        # desktop header + About modal
│   ├── HeaderMobile.tsx  # mobile header + slide-in menu
│   └── ThemeSwitch.tsx   # light/dark toggle
└── data/
    ├── arrayKBBI.js      # Indonesian word list (from esc-front-existing)
    └── arrayEN.js        # English word list (from esc-front-existing)
```
