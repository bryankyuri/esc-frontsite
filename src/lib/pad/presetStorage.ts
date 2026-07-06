// Chord Pad persistence: schema, versioning, and safe localStorage access.
// See docs/CHORD-PAD-SDD.md §4.5.

import {
  diatonicPads,
  type PadAssignment,
  type Quality,
} from "@/lib/pad/chords";

export type Instrument = "piano" | "organ";
export type TimeSig = "2/4" | "3/4" | "4/4" | "6/8";

export interface MetronomeState {
  bpm: number;
  timeSig: TimeSig;
  mode: "click" | "groove";
  grooveId: string;
}

export interface WorkingState {
  pads: (PadAssignment | null)[]; // length 10
  instrument: Instrument;
  transpose: number; // −11…11
  volume: number; // 0–100
  metronome: MetronomeState;
}

export interface Preset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  state: WorkingState;
}

export interface PadStore {
  schemaVersion: 1;
  activeState: WorkingState | null;
  presets: Preset[];
  /** Set once the built-in starter presets have been added, so we never
   *  re-add them after the user deletes them. */
  defaultsSeeded?: boolean;
}

export const MAX_PRESETS = 10;
export const PAD_COUNT = 10;
export const NAME_MAX = 24;

const KEY = "esc.pad.v1";

/** A fresh, playable working state: C-major palette + two colour chords. */
export function defaultWorkingState(): WorkingState {
  const pads: (PadAssignment | null)[] = [...diatonicPads(0)];
  pads.push({ root: 0, quality: "maj7", octaveShift: 0 }); // Cmaj7
  pads.push({ root: 7, quality: "7", octaveShift: 0 }); // G7
  pads.push(null);
  return {
    pads: pads.slice(0, PAD_COUNT),
    instrument: "piano",
    transpose: 0,
    volume: 72,
    metronome: { bpm: 96, timeSig: "4/4", mode: "click", grooveId: "" },
  };
}

// ----- built-in starter presets -----
// Ten of the most-used songwriter chord progressions, each as a playable
// palette: the progression's chords come first, then a few companions.
// Roots: C=0 C#=1 D=2 D#=3 E=4 F=5 F#=6 G=7 G#=8 A=9 A#=10 B=11.

const SEED_DATE = "2026-07-06T00:00:00.000Z";

type Chord = [number, Quality];

function padsOf(chords: Chord[]): (PadAssignment | null)[] {
  const pads: (PadAssignment | null)[] = chords.map(([root, quality]) => ({
    root,
    quality,
    octaveShift: 0,
  }));
  while (pads.length < PAD_COUNT) pads.push(null);
  return pads.slice(0, PAD_COUNT);
}

function seedPreset(
  id: string,
  name: string,
  chords: Chord[],
  metronome: MetronomeState
): Preset {
  return {
    id,
    name,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
    state: {
      pads: padsOf(chords),
      instrument: "piano",
      transpose: 0,
      volume: 72,
      metronome,
    },
  };
}

const metro = (
  bpm: number,
  timeSig: TimeSig,
  mode: "click" | "groove",
  grooveId: string
): MetronomeState => ({ bpm, timeSig, mode, grooveId });

export function defaultPresets(): Preset[] {
  return [
    // I–V–vi–IV — the "four chords" behind countless pop hits (C)
    seedPreset(
      "def-pop-axis",
      "Pop Axis · C",
      [[0, "maj"], [7, "maj"], [9, "min"], [5, "maj"], [2, "min"], [4, "min"], [5, "maj7"], [7, "7"], [0, "maj7"]],
      metro(104, "4/4", "click", "pop8")
    ),
    // I–vi–IV–V — 50s doo-wop / "Stand By Me" (C)
    seedPreset(
      "def-doowop",
      "50s Doo-Wop · C",
      [[0, "maj"], [9, "min"], [5, "maj"], [7, "maj"], [2, "min"], [4, "min"], [7, "7"], [0, "maj7"]],
      metro(120, "4/4", "click", "pop8")
    ),
    // vi–IV–I–V — the "sensitive" / pop-ballad turn (G)
    seedPreset(
      "def-sensitive",
      "Sensitive vi–IV–I–V · G",
      [[4, "min"], [0, "maj"], [7, "maj"], [2, "maj"], [9, "min"], [11, "min"], [0, "maj7"], [2, "7"]],
      metro(84, "4/4", "click", "pop8")
    ),
    // ii–V–I — the core of jazz (C)
    seedPreset(
      "def-jazz-251",
      "Jazz ii–V–I · C",
      [[2, "min7"], [7, "7"], [0, "maj7"], [5, "maj7"], [4, "min7"], [9, "min7"], [11, "m7b5"], [4, "7"]],
      metro(120, "4/4", "groove", "shuffle")
    ),
    // I–IV–V dominant — 12-bar blues (A)
    seedPreset(
      "def-blues-a",
      "Blues · A",
      [[9, "7"], [2, "7"], [4, "7"], [9, "maj"], [2, "maj"], [4, "maj"]],
      metro(88, "4/4", "groove", "shuffle")
    ),
    // I–V–vi–iii–IV–I–IV–V — Pachelbel's Canon (D)
    seedPreset(
      "def-canon",
      "Canon · D",
      [[2, "maj"], [9, "maj"], [11, "min"], [6, "min"], [7, "maj"], [2, "maj"], [7, "maj"], [9, "maj"]],
      metro(68, "4/4", "click", "rock")
    ),
    // i–VII–VI–V — Andalusian cadence / flamenco (A minor)
    seedPreset(
      "def-andalusian",
      "Andalusian · Am",
      [[9, "min"], [7, "maj"], [5, "maj"], [4, "maj"], [2, "min"], [0, "maj"], [4, "7"], [9, "min7"]],
      metro(96, "4/4", "click", "rock")
    ),
    // i–VI–III–VII — minor pop ("Zombie") (A minor)
    seedPreset(
      "def-minor-pop",
      "Minor Pop · Am",
      [[9, "min"], [5, "maj"], [0, "maj"], [7, "maj"], [2, "min"], [4, "min"], [5, "maj7"], [4, "7"]],
      metro(92, "4/4", "click", "pop8")
    ),
    // I–bVII–IV — Mixolydian rock ("Sweet Home"/"Sympathy") (E)
    seedPreset(
      "def-mixolydian",
      "Rock Mixolydian · E",
      [[4, "maj"], [2, "maj"], [9, "maj"], [11, "maj"], [1, "min"], [7, "maj"], [6, "min"]],
      metro(128, "4/4", "groove", "rock")
    ),
    // I–IV–V + companions — folk / country / worship (G)
    seedPreset(
      "def-folk-g",
      "Folk I–IV–V · G",
      [[7, "maj"], [0, "maj"], [2, "maj"], [4, "min"], [9, "min"], [11, "min"], [2, "7"], [0, "add9"]],
      metro(100, "4/4", "click", "rock")
    ),
  ];
}

function freshStore(): PadStore {
  return {
    schemaVersion: 1,
    activeState: null,
    presets: defaultPresets(),
    defaultsSeeded: true,
  };
}

/**
 * Load the store, tolerating corruption: unparseable data is backed up to
 * `esc.pad.v1.corrupt` and a fresh store is returned so the page never crashes.
 */
export function loadStore(): PadStore {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return freshStore();
  }
  if (!raw) return freshStore();
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.schemaVersion !== 1 ||
      !Array.isArray(parsed.presets)
    ) {
      throw new Error("unrecognized store shape");
    }
    // Seed the starter presets once for anyone who has never had them
    // (new users, or existing users from before this feature with none saved).
    const seedNeeded = !parsed.defaultsSeeded && parsed.presets.length === 0;
    return {
      schemaVersion: 1,
      activeState: parsed.activeState ?? null,
      presets: seedNeeded
        ? defaultPresets()
        : parsed.presets.slice(0, MAX_PRESETS),
      defaultsSeeded: true,
    };
  } catch {
    try {
      localStorage.setItem(KEY + ".corrupt", raw);
    } catch {
      /* ignore */
    }
    return freshStore();
  }
}

/** Persist the store. Silently ignores quota / disabled-storage errors. */
export function saveStore(store: PadStore): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function newPresetId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
