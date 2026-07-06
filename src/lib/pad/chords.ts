// Pure chord math for the Chord Pad. No audio, no React — unit-testable.
// See docs/CHORD-PAD-SDD.md §4.2.

export type Quality =
  | "maj"
  | "min"
  | "7"
  | "maj7"
  | "min7"
  | "m7b5"
  | "dim"
  | "aug"
  | "sus2"
  | "sus4"
  | "add9"
  | "6";

export interface PadAssignment {
  /** 0–11, where 0 = C. */
  root: number;
  quality: Quality;
  /** Octave offset around the base register. */
  octaveShift: -1 | 0 | 1;
}

/** Semitone intervals from the root for each quality. */
export const QUALITY_INTERVALS: Record<Quality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  "6": [0, 4, 7, 9],
};

/** Short suffix appended after the root name to form a chord label. */
export const QUALITY_LABEL: Record<Quality, string> = {
  maj: "",
  min: "m",
  "7": "7",
  maj7: "maj7",
  min7: "m7",
  m7b5: "m7♭5",
  dim: "dim",
  aug: "aug",
  sus2: "sus2",
  sus4: "sus4",
  add9: "add9",
  "6": "6",
};

/** Human-friendly quality names for the assign picker. */
export const QUALITY_ORDER: Quality[] = [
  "maj",
  "min",
  "7",
  "maj7",
  "min7",
  "6",
  "sus2",
  "sus4",
  "add9",
  "dim",
  "aug",
  "m7b5",
];

const SHARP_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];

/** Root names for the picker (0 = C … 11 = B). */
export const NOTE_NAMES = SHARP_NAMES;

/** True modulo that stays non-negative for negative inputs. */
function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/**
 * MIDI note numbers for a pad, after applying the global transpose.
 * Base register centres the chord around C3 (MIDI 48).
 */
export function notesFor(pad: PadAssignment, transpose = 0): number[] {
  const root = 48 + mod12(pad.root + transpose) + 12 * pad.octaveShift;
  return QUALITY_INTERVALS[pad.quality].map((interval) => root + interval);
}

/** MIDI note → frequency in Hz (equal temperament, A4 = 440). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Frequencies (Hz) for a pad — convenience for the audio engine. */
export function freqsFor(pad: PadAssignment, transpose = 0): number[] {
  return notesFor(pad, transpose).map(midiToFreq);
}

/** Chord label as displayed on the pad, e.g. "Dm7", reflecting transpose. */
export function labelFor(pad: PadAssignment, transpose = 0): string {
  return NOTE_NAMES[mod12(pad.root + transpose)] + QUALITY_LABEL[pad.quality];
}

/** Just the (possibly transposed) root name, e.g. "F♯". */
export function rootName(root: number, transpose = 0): string {
  return NOTE_NAMES[mod12(root + transpose)];
}

// Major scale: degree semitone + diatonic triad quality (I ii iii IV V vi vii°).
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE_QUALITIES: Quality[] = [
  "maj",
  "min",
  "min",
  "maj",
  "maj",
  "min",
  "dim",
];

/**
 * The seven diatonic triads of a major key, as pad assignments.
 * Used to seed / auto-fill the pad grid from a chosen key.
 */
export function diatonicPads(keyRoot: number): PadAssignment[] {
  return MAJOR_SCALE_STEPS.map((step, i) => ({
    root: mod12(keyRoot + step),
    quality: MAJOR_SCALE_QUALITIES[i],
    octaveShift: 0 as const,
  }));
}
