// Audio engine for the Chord Pad — a thin singleton wrapper over Tone.js.
// See docs/CHORD-PAD-SDD.md §4.4.
//
// Kept imperative on purpose: pads call noteOn/noteOff directly so pressing a
// pad never triggers a React re-render.

import * as Tone from "tone";
import { freqsFor, type PadAssignment } from "@/lib/pad/chords";

export type Instrument = "piano" | "organ";

let started = false;
let masterGain: Tone.Gain | null = null;
let piano: Tone.PolySynth | null = null;
let organ: Tone.PolySynth | null = null;
let current: Instrument = "piano";

/** Frequencies currently sounding, keyed by pad index, so release is exact. */
const activeByPad = new Map<number, number[]>();

function activeSynth(): Tone.PolySynth | null {
  return current === "piano" ? piano : organ;
}

/**
 * Resolve the audio context (must be called from a user gesture) and build the
 * instrument graph once. Safe to call repeatedly.
 */
export async function ensureStarted(): Promise<void> {
  if (started) return;

  // Use a larger audio buffer ("playback") so low-end phones don't get render
  // underruns (the crackle on sustained chords). Costs a little latency, which
  // is fine for holding chords. Must be set before any node is created.
  Tone.setContext(new Tone.Context({ latencyHint: "playback", lookAhead: 0.05 }));
  await Tone.start();

  const limiter = new Tone.Limiter(-1).toDestination();
  masterGain = new Tone.Gain(0.72).connect(limiter);

  // Electric-piano-ish: triangle body, moderate decay so held pads still ring.
  piano = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.005, decay: 0.35, sustain: 0.35, release: 0.5 },
  }).connect(masterGain);
  piano.maxPolyphony = 12;

  // Drawbar-organ timbre via a few additive partials. Kept short (4 partials)
  // so sustained chords stay cheap on low-end phones.
  organ = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "custom",
      partials: [1, 0.7, 0.4, 0.25],
    },
    envelope: { attack: 0.02, decay: 0.1, sustain: 1, release: 0.3 },
  }).connect(masterGain);
  organ.maxPolyphony = 12;

  started = true;
}

export function isStarted(): boolean {
  return started;
}

export function setInstrument(inst: Instrument): void {
  if (inst === current) return;
  releaseAll();
  current = inst;
}

export function getInstrument(): Instrument {
  return current;
}

/** Master volume, 0–100 (linear gain). */
export function setVolume(percent: number): void {
  if (!masterGain) return;
  masterGain.gain.rampTo(Math.max(0, Math.min(100, percent)) / 100, 0.02);
}

/** Start sounding a pad's chord. No-op until the engine is started. */
export function noteOn(padIndex: number, pad: PadAssignment, transpose: number): void {
  const synth = activeSynth();
  if (!synth) return;
  // If this pad is somehow already down, release it first to avoid stuck notes.
  if (activeByPad.has(padIndex)) noteOff(padIndex);
  const freqs = freqsFor(pad, transpose);
  synth.triggerAttack(freqs);
  activeByPad.set(padIndex, freqs);
}

/** Release a pad's chord. */
export function noteOff(padIndex: number): void {
  const freqs = activeByPad.get(padIndex);
  if (!freqs) return;
  activeByPad.delete(padIndex);
  activeSynth()?.triggerRelease(freqs);
}

/** Release every sounding note (instrument switch, page hide, cleanup). */
export function releaseAll(): void {
  activeByPad.clear();
  piano?.releaseAll();
  organ?.releaseAll();
}
