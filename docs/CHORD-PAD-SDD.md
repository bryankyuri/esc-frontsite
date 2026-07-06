# Software Design Document — Chord Pad

| | |
|---|---|
| Feature | Chord Pad (`/pad`) — pocket chord instrument for songwriters |
| App | `public-frontend` (Vite + React 18 + TypeScript + Tailwind) |
| Status | Draft v1.0 — 2026-07-06 |
| Author | Bryan Qurniawan / Claude |
| UI mockups | https://claude.ai/code/artifact/ed670b9a-11fd-4e19-8486-b97605cfc2db |

---

## 1. Purpose & goals

Songwriters lose ideas in the minutes it takes to open a DAW or find an instrument. Chord Pad is an **instant-access, browser-based chord instrument**: open the page (or the installed PWA, even offline), press and hold pads to hear chords, keep a metronome running, and sketch the idea before it evaporates.

It is deliberately **not** a VST/DAW replacement — no recording, no MIDI, no velocity, no voicing editor.

### Success criteria
- From tapping the home-screen icon to a sounding chord: **< 5 seconds**, including offline.
- Usable one-handed on a phone; two thumbs can hold two pads simultaneously.
- A saved preset survives closing the browser (localStorage, no account needed).

## 2. Scope

### In scope (v1)
- 10 assignable chord pads (press & hold to sustain, multi-touch).
- Chord assignment per pad: root (12 keys) × quality × octave shift (−1/0/+1).
- **Diatonic auto-fill**: pick a key → pads 1–7 fill with the diatonic triads.
- **Global transpose** ±11 semitones; pad labels re-render in the transposed key.
- **Edit mode** (gear ⚙): pads become editable — tap to reassign, delete badge, drag-and-drop reorder.
- Instruments: Piano and Organ (global selection), master volume.
- Presets in localStorage: max 10, named, create/rename/overwrite/delete.
- Metronome: BPM 40–240, tap tempo, time signatures 2/4 · 3/4 · 4/4 · 6/8, accent on beat 1, visual beat LEDs.
- **Drum grooves**: metronome mode toggle Click ↔ Groove — preset (non-editable) drum patterns played by a synthesized kick/snare/hi-hat kit, filtered by time signature.
- Desktop keyboard mapping: keys `1 2 3 4 5 6 7 8 9 0` → pads 1–10.
- PWA: installable, works fully offline **except** API-backed pages; API responses are never cached.

### Out of scope (v1)
Recording/export, arpeggiator/strumming, per-pad instruments, inversions/voicing control, MIDI I/O, velocity layers, cloud sync of presets, sharing presets, **user-programmable drum patterns** (grooves are fixed presets).

## 3. Architecture

Entirely client-side. No backend changes, no new endpoints, no auth.

```
public-frontend/src/
├── App.tsx                     # + <Route path="/pad" element={<Pad />} /> (lazy)
├── pages/
│   └── Pad.tsx                 # page shell: layout, unlock overlay, wiring
├── components/pad/
│   ├── PadGrid.tsx             # 10 pads, pointer + keyboard handling, edit-mode DnD (dnd-kit)
│   ├── PadButton.tsx           # single pad (idle/active/empty/editing/dragging states)
│   ├── ChordAssignSheet.tsx    # root / quality / octave picker (modal on desktop, bottom sheet on mobile)
│   ├── PresetBar.tsx           # LCD readout, prev/next, save/new/delete
│   ├── PresetManager.tsx       # list of 10 slots, rename/overwrite/delete
│   ├── TransposeStepper.tsx
│   ├── InstrumentSwitch.tsx
│   ├── VolumeFader.tsx
│   └── Metronome.tsx           # BPM, tap tempo, time sig, beat LEDs, click/groove switch + groove picker
├── hooks/
│   ├── useAudioEngine.ts       # singleton engine wrapper (init/unlock, noteOn/noteOff)
│   ├── useMetronome.ts
│   └── usePresets.ts           # localStorage CRUD + active working state
└── lib/pad/
    ├── chords.ts               # chord math (pure functions, unit-testable)
    ├── audioEngine.ts          # Tone.js setup: instruments, voices, master chain
    ├── grooves.ts              # hardcoded groove step data + synthesized drum kit
    └── presetStorage.ts        # schema, versioning, (de)serialization
```

New dependencies: **`tone`** (Tone.js, ~150 kB gzipped, tree-shakeable) and **`@dnd-kit/core` + `@dnd-kit/sortable`** (~15 kB, pad reordering). The `/pad` route is lazy-loaded (`React.lazy`) so neither loads on Home/Check/Rhyme.

## 4. Feature specifications

### 4.1 Pads
- Grid: **5×2 on ≥1024px**, **2×5 on mobile portrait**.
- `pointerdown` → `noteOn(chord)`; `pointerup` / `pointercancel` / `pointerleave` → `noteOff`. Use pointer capture per pad; track active pointers in a `Map<pointerId, padIndex>` so multi-touch works.
- `touch-action: none` on the grid; `user-select: none`; context-menu suppressed (long-press on Android must not open it).
- Empty pad shows a recessed "＋" well → opens ChordAssignSheet.
- Release uses a ~0.4 s envelope tail so chords don't click off.
- Editing an assigned pad happens in **edit mode** (§4.8), never in play mode — playing must be interruption-free.

### 4.2 Chord model & math (`lib/pad/chords.ts`)

```ts
type Quality = "maj" | "min" | "7" | "maj7" | "min7" | "m7b5"
             | "dim" | "aug" | "sus2" | "sus4" | "add9" | "6";

interface PadAssignment {
  root: number;        // 0–11 (0 = C)
  quality: Quality;
  octaveShift: -1 | 0 | 1;   // around base octave 4 (chord tones near C4)
}
```

Interval tables (semitones from root):

| Quality | Intervals | | Quality | Intervals |
|---|---|---|---|---|
| maj | 0 4 7 | | dim | 0 3 6 |
| min | 0 3 7 | | aug | 0 4 8 |
| 7 | 0 4 7 10 | | sus2 | 0 2 7 |
| maj7 | 0 4 7 11 | | sus4 | 0 5 7 |
| min7 | 0 3 7 10 | | add9 | 0 4 7 14 |
| m7b5 | 0 3 6 10 | | 6 | 0 4 7 9 |

- `notesFor(pad, transpose): number[]` → MIDI notes: `48 + ((root + transpose) % 12) + interval + 12·octaveShift` (base C3=48 keeps voicings in guitar/piano sketch range).
- `labelFor(pad, transpose): string` → e.g. `{root: 2, quality: "min7"}` at transpose 0 → "Dm7"; at +2 → "Em7". Prefer sharps for sharp-side keys, flats for flat-side (simple lookup table of the 12 transposed roots; enharmonic perfection is out of scope).
- **Diatonic auto-fill**: key K major → pads 1–7 = I, ii, iii, IV, V, vi, vii° of K; pads 8–10 left empty. (Minor-key auto-fill can come later.)

### 4.3 Transpose
- Global integer, **−11…+11**, default 0, stored per preset *working state* but NOT baked into pad assignments.
- Applies at `noteOn` time and to label rendering — what you read is what you hear.
- LCD shows offset and effective key hint (e.g. `+2 · D → E` when pad 1 is D).
- Reset control (tap the LCD) returns to 0.

### 4.4 Instruments & audio engine (`lib/pad/audioEngine.ts`)
- **Organ**: `Tone.PolySynth` with additive-ish patch (fatsine/organ partials, fast attack, sustained). Pure synthesis, zero assets — always available offline instantly.
- **Piano**: v1 ships a `Tone.PolySynth` electric-piano-style patch (no samples). v1.1 may upgrade to `Tone.Sampler` with ~12 self-hosted Salamander samples (mp3, ~1.5 MB) precached by the service worker. UI is identical either way.
- Master chain: `PolySynth → Tone.Volume (fader) → Tone.Limiter(-1 dB) → Destination` (limiter prevents clipping when 2 pads × 4 notes stack).
- Voice management: max ~16 voices; `noteOff` releases only that pad's notes.
- **Unlock**: browsers require a user gesture before audio. First interaction on the page calls `Tone.start()`; until resolved, show a "tap to power on" overlay and keep the AUDIO LED grey. iOS Safari: also handle `visibilitychange` → resume context.

### 4.5 Presets (`lib/pad/presetStorage.ts`)

localStorage key: `esc.pad.v1`

```ts
interface PadStore {
  schemaVersion: 1;
  activeState: WorkingState;      // always-saved scratch state (survives refresh, never "lost idea")
  presets: Preset[];              // max 10
}
interface Preset {
  id: string;                     // crypto.randomUUID()
  name: string;                   // 1–24 chars
  createdAt: string; updatedAt: string;  // ISO
  state: WorkingState;
}
interface WorkingState {
  pads: (PadAssignment | null)[]; // length 10
  instrument: "piano" | "organ";
  transpose: number;              // −11…11
  volume: number;                 // 0–100
  metronome: {
    bpm: number;
    timeSig: "2/4" | "3/4" | "4/4" | "6/8";
    mode: "click" | "groove";
    grooveId: string;             // last-selected groove per working state
  };
}
```

Rules:
- Every state mutation debounce-writes `activeState` (300 ms) — reopening the page restores exactly where you were, saved or not.
- "SAVE" on an existing preset = overwrite (with confirm); "NEW" = save-as (blocked with a clear message at 10 slots: "Preset limit reached — delete one to save").
- Unsaved-changes indicator: dot on the preset LCD when `activeState` diverges from the loaded preset.
- Corrupt/unparseable JSON → back up to `esc.pad.v1.corrupt`, start fresh (never crash the page).
- Migrations keyed off `schemaVersion`.

### 4.6 Metronome
- Scheduling via `Tone.Transport` + `Tone.Loop` (sample-accurate; **never** `setInterval` for the click).
- Click: two short synthesized blips (`Tone.MembraneSynth` or filtered noise) — high pitch beat 1, low pitch others.
- Time signature sets beats-per-bar: 2/4→2, 3/4→3, 4/4→4, 6/8→6 (eighth-note pulse, accent on 1; dotted-quarter feel is a v2 nicety).
- Tap tempo: average of last 4 tap intervals, clamped 40–240.
- Beat LEDs driven by `Tone.Draw` callbacks so visuals stay in sync with audio.
- Independent of pads: runs while playing, assigning, or switching presets.

### 4.7 Edit mode (gear ⚙)
- Gear button in the titlebar toggles **play ↔ edit**; gear glows amber while editing.
- In edit mode pads are **muted** (no `noteOn`), wiggle subtly, and show three affordances:
  - **✕ badge** (top-left) → clears the pad to empty (single undo toast: "Pad cleared — Undo").
  - **✎ badge** (top-right) or tapping the pad body → opens ChordAssignSheet.
  - **grip** (bottom) → drag-and-drop reorder.
- Reorder via **`@dnd-kit/core` + `@dnd-kit/sortable`** (small, pointer- and keyboard-accessible, touch-friendly). Reordering just moves entries in the `pads` array — order is intrinsically part of the preset, no extra field needed.
- Keyboard mapping follows position: after reorder, key `1` is always the top-left pad.
- Exiting edit mode (gear again or Done button) returns to play; edit state is never persisted as "on".

### 4.8 Drum grooves (metronome enhancement)
- Metronome gains a mode toggle: **Click | Groove**. Groove replaces the click with a preset drum pattern at the same BPM/Transport — start/stop, tap tempo, and beat LEDs behave identically.
- **Sound source: synthesized, no samples.** Kick = `Tone.MembraneSynth`, snare = `Tone.NoiseSynth` through a bandpass filter, closed hi-hat = `Tone.MetalSynth` (short envelope). Zero licensing, zero download, works offline by definition, and sounds intentionally sketch-like — consistent with the "not a DAW" positioning. (If real one-shot samples are ever wanted, see Appendix C for safe free sources.)
- Patterns are **hardcoded step data, not editable** — v1 set:

| Time sig | Grooves |
|---|---|
| 4/4 | Straight Rock · Pop 8ths · Four-on-the-Floor · Shuffle (swung 8ths) |
| 3/4 | Waltz |
| 6/8 | Ballad 6/8 |
| 2/4 | March |

```ts
interface Groove {
  id: string;            // "pop-8ths"
  name: string;          // "POP 8THS"
  timeSig: TimeSig;      // groove list is filtered by the selected time signature
  subdivision: "8n" | "16n";
  steps: { kick: number[]; snare: number[]; hat: number[] };  // step indices, velocity implied by accent map
  accents?: number[];    // optional per-step accent
  swing?: number;        // 0–1, Tone.Transport.swing for shuffle feels
}
```

- Scheduling: one `Tone.Sequence` per part on the shared `Tone.Transport`; switching time signature auto-selects that signature's first groove.
- UI: 2-state segmented switch + groove LCD with ◂ ▸ (see mockups §5).

### 4.9 Keyboard (desktop)
`1–0` → pads 1–10 (keydown = noteOn once, ignore auto-repeat; keyup = noteOff). `Space` toggles metronome. Disabled while a text input (preset name) is focused.

## 5. UI / UX specification

Full visual spec with rendered mockups, dimensions, and tokens:
**https://claude.ai/code/artifact/ed670b9a-11fd-4e19-8486-b97605cfc2db**

Summary:
- Look: dark hardware panel ("VST window"), **single-theme dark in both site themes** — the instrument is a physical object. Chassis `#131317`, module faces `#212127→#26262d`, LCD wells `#0e0e12`, silkscreen text `#ece7dd` / dim `#8e8b96`, and ESC amber `#ffc778` as the only glow color (LEDs, LCD text, active pads).
- Desktop (≥1024px): 960-wide plugin window; titlebar (brand · preset LCD + save/new/delete · audio LED); left rack 236px (Instrument, Transpose, Volume, Metronome); right 5×2 pad grid, pads ≈128×128, gap 12.
- Mobile: full-bleed window; titlebar → preset row → controls strip (instrument + transpose, then metronome) → 2×5 pad grid, pads ≈170×96, gap 11 — pads own the thumb zone.
- Active pad: amber gradient + glow, label inverts near-black. Empty pad: recessed dashed well with ＋.
- Edit mode: gear ⚙ in titlebar (amber when active); editing pads wiggle with ✕/✎ badges (23px ⌀, −9px corner offset) and bottom grip; dragging pad lifts/tilts with amber outline; drop slot is a dashed amber well.
- Groove selector: Click|Groove segmented switch + groove name LCD with ◂ ▸, inside the Metronome module (desktop) / second metronome row (mobile).
- Type: condensed uppercase letterspaced labels (Bahnschrift/Arial Narrow stack), chord names system-sans 700 (27px desktop / 24px mobile), `tabular-nums` for BPM/readouts.
- The page keeps the site Header for navigation; the plugin window sits below it. i18n via `react-i18next` like other pages (labels like HOLD/RUN stay English — hardware vernacular).

## 6. PWA design

Requirement: the site is installable and works offline, **but API responses must never be cached**.

- Plugin: **`vite-plugin-pwa`** (`registerType: "autoUpdate"`, `generateSW` strategy).
- **Precache** (app shell): built JS/CSS chunks, `index.html`, logo/fonts/icons — everything under `dist/`. This makes `/pad` fully offline including audio (synthesized; if samples are added later, add them to `globPatterns` so they're precached too).
- **Never cache API**: all API traffic goes to `VITE_API_BASE_URL` (separate origin, `api-member.earhousesongwritingclub.com` region). Workbox only intercepts what we register; we register **no runtime caching route for that origin** — API requests pass straight to the network. Explicitly: no `NetworkFirst`/`StaleWhileRevalidate` for it.
- `navigateFallback: "/index.html"` for SPA routes, with `navigateFallbackDenylist: [/^\/api/]` as a guard.
- Offline UX: `/pad` fully works. Home/Check/Rhyme render but their lookups fail — each page shows its normal fetch-error state; add a small `navigator.onLine` "You're offline — Chord Pad still works" banner (nice-to-have).
- Manifest: name "Earhouse Songwriting Club", short_name "ESC", `display: "standalone"`, `orientation: "portrait"` omitted (allow both), theme_color `#131317`, background `#131317`, 192/512 maskable icons (derive from `logo-esc.png`).
- Note: `vercel.json` exists — ensure the deploy target serves `sw.js` and `manifest.webmanifest` with correct MIME and that `sw.js` is **not** long-cache-immutable (`Cache-Control: no-cache` header rule).

## 7. Edge cases & error handling

| Case | Behavior |
|---|---|
| Audio context blocked (autoplay policy) | "Tap to power on" overlay; LED grey until `Tone.start()` resolves |
| Tab backgrounded on iOS → context suspended | resume on `visibilitychange`/next gesture |
| localStorage full / quota | toast "Couldn't save preset — storage full"; working state stays in memory |
| Corrupt store JSON | back up + reset (see 4.5) |
| 11th preset | blocked with explicit message |
| Pointer leaves pad while held | treated as release (no stuck notes); also global `pointerup` safety net |
| Rapid pad mashing | voice cap + limiter prevent glitch/clip |
| Screen sleep during use | request `navigator.wakeLock` while metronome runs (progressive enhancement) |

## 8. Performance

- Lazy-load the route: Tone.js only in the `/pad` chunk.
- Target < 250 kB gzipped for the pad chunk (synth-only v1 easily fits).
- No re-render on pad press: pads talk to the audio engine via refs/imperative handle; React state changes only on assignment/preset/transpose edits.
- Latency: Tone.js default lookAhead lowered (`Tone.context.lookAhead = 0.01`) for responsive pads.

## 9. Verification checklist

- [ ] Chrome/Android + Safari/iOS: hold pad sustains, release stops, two pads at once.
- [ ] Long-press on Android does not open context menu / select text.
- [ ] Keys 1–0 play; auto-repeat doesn't retrigger.
- [ ] Transpose +2: pad labeled D sounds E and label reads E.
- [ ] Preset save → hard refresh → preset and working state intact; 10-slot limit enforced.
- [ ] Metronome at 4/4 vs 6/8 accents correctly; no drift over 5 minutes (compare against a reference metronome).
- [ ] Edit mode: pads silent; delete + undo works; drag-reorder persists after refresh; key `1` follows the reordered top-left pad.
- [ ] Groove mode: switching time signature swaps to a valid groove; click↔groove toggle is seamless while running; shuffle actually swings.
- [ ] Airplane mode: installed PWA opens, `/pad` fully functional; Check/Rhyme show their fetch-error states; DevTools shows zero API responses served from cache.
- [ ] Lighthouse PWA installability passes.

## 10. Milestones

1. **M1 — Sound core** (chords.ts + audioEngine + bare 10-pad grid, hold-to-play, transpose). *The riskiest 20% — validate iOS touch+audio here first.*
2. **M2 — Assignment UX** (ChordAssignSheet, diatonic auto-fill, instrument/volume, edit mode with delete + dnd-kit reorder).
3. **M3 — Presets** (storage schema, PresetBar/Manager, active-state persistence).
4. **M4 — Metronome & grooves** (transport, tap tempo, time sigs, LEDs, synthesized drum kit + preset patterns).
5. **M5 — VST skin & responsive polish** (apply the mockup spec, keyboard mapping, wake lock).
6. **M6 — PWA** (vite-plugin-pwa, manifest, icons, offline verification, deploy header rules).

## Appendix A — Gemini image-generation prompts

Only needed if you want marketing/visual exploration imagery — the production UI will be built directly in code from the mockup spec.

**A1. Hero / concept shot**
> Photorealistic product render of a modern hardware chord-pad instrument UI on a smartphone screen held in one hand, dark charcoal brushed-metal panel (#131317), 10 rubber drum pads in a 2x5 grid, one pad glowing warm amber (#ffc778) as it's pressed, chord names like "Dmaj7", "Em7", "F#m" silkscreen-printed on the pads, small amber LCD display showing preset name "Senja di Ambarawa" and "96 BPM 4/4", condensed uppercase silkscreen typography, subtle LED glow, moody studio lighting at dusk, shallow depth of field, songwriter's desk with a notebook and guitar out of focus in the background, 9:16.

**A2. Desktop UI exploration**
> UI design mockup of a VST plugin window, 960x600, dark hardware aesthetic: charcoal panel #131317, left control rack with modules labeled INSTRUMENT (Piano/Organ toggle), TRANSPOSE (+2 on amber LCD), VOLUME fader, METRONOME (96 BPM, 4/4, four beat LEDs), right side a 5x2 grid of dark rubber pads with chord names (D, Em7, F#m, Gadd9, Asus4, Bm, C#dim, Dmaj7, G/B, and one empty pad with a plus sign), amber #ffc778 accent glow on one active pad, condensed uppercase labels, flat front-on view, clean vector style, high fidelity.

**A3. Style variations** — append to A2:
> Variation set: (1) warmer cream silkscreen text, (2) brushed aluminum light panel version, (3) more skeuomorphic with screws and beveled edges, (4) flatter minimal version with the same layout.

## Appendix B — Decisions log

| Decision | Choice | Why |
|---|---|---|
| Audio library | Tone.js | Sampler + Transport (metronome) + polyphony solved in one dependency |
| Piano v1 | synthesized | zero assets → instant offline; sampler upgrade is UI-invisible |
| Transpose | global, label-affecting | matches capo mental model; per-pad transpose adds confusion |
| Theme | single dark hardware look | plugin-window metaphor; ESC amber ties into brand |
| Presets | localStorage only | no auth on public site; 10×~1 kB is nowhere near quota |
| PWA API caching | none (network passthrough) | requirement; stale linguistic/API data worse than an error |
| Pad editing | separate edit mode via gear | play mode stays interruption-free; matches hardware "shift/edit" convention |
| Drum groove sounds | synthesized (no samples) | zero licensing, zero download, offline by default; see Appendix C |
| Reorder library | @dnd-kit | small, touch + keyboard accessible; hand-rolling touch DnD is error-prone |

## Appendix C — Free drum sound sources

**Recommendation: don't use external samples at all.** The v1 groove kit is synthesized with Tone.js (kick `MembraneSynth`, snare `NoiseSynth`+bandpass, hat `MetalSynth`) — zero licensing risk, zero bytes to download, offline by definition, and the lo-fi character fits a sketching tool. Drum *patterns* (the rhythms themselves) are not copyrightable at this length, so hardcoding classic grooves is safe.

If we later want real one-shot samples, safe options for **shipping inside a web app** (which counts as redistribution — stricter than "use in your song"):

| Source | License | Notes |
|---|---|---|
| freesound.org (filter: CC0) | CC0 | Best option; search "drum one shot kick/snare/hat", filter license = Creative Commons 0 |
| 99sounds.org | royalty-free; check pack readme | drum packs are free for commercial use; verify redistribution wording per pack |
| SampleSwap.org | CC / public-domain-ish | check per-file |
| Hydrogen drum kits | varies per kit (many CC-BY / CC0, some GPL) | ship the kit's license notice alongside |
| Archive.org vintage drum-machine packs (808/LinnDrum etc.) | CC0 where marked | verify the upload's license tag before bundling |

**Avoid**: MusicRadar/SampleRadar packs (license allows use *in music*, forbids redistribution as samples — an app bundle is redistribution), Splice/Loopcloud content, and any "free" pack without an explicit license file.
