// Metronome + drum-groove engine. Synthesized kit (no samples) scheduled on the
// shared Tone.Transport for sample-accurate timing. See docs/CHORD-PAD-SDD.md §4.8.

import * as Tone from "tone";
import type { MetronomeState, TimeSig } from "@/lib/pad/presetStorage";

export interface Groove {
  id: string;
  name: string;
  timeSig: TimeSig;
  /** Step indices (in eighth-notes) that trigger each drum. */
  kick: number[];
  snare: number[];
  hat: number[];
  swing?: boolean;
}

// Bar length in eighth-note steps, and how many steps make one displayed beat.
const STEPS_PER_BAR: Record<TimeSig, number> = { "2/4": 4, "3/4": 6, "4/4": 8, "6/8": 6 };
const STEPS_PER_BEAT: Record<TimeSig, number> = { "2/4": 2, "3/4": 2, "4/4": 2, "6/8": 1 };

export function beatsPerBar(ts: TimeSig): number {
  return STEPS_PER_BAR[ts] / STEPS_PER_BEAT[ts];
}

// Hardcoded grooves, filtered by time signature. Patterns are short and
// classic, so not copyrightable — safe to ship.
export const GROOVES: Groove[] = [
  { id: "rock", name: "Rock", timeSig: "4/4", kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] },
  { id: "pop8", name: "Pop 8ths", timeSig: "4/4", kick: [0, 3, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7] },
  { id: "four", name: "4-on-floor", timeSig: "4/4", kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7] },
  { id: "shuffle", name: "Shuffle", timeSig: "4/4", kick: [0, 4], snare: [2, 6], hat: [0, 2, 4, 6], swing: true },
  { id: "waltz", name: "Waltz", timeSig: "3/4", kick: [0], snare: [2, 4], hat: [0, 2, 4] },
  { id: "ballad68", name: "Ballad 6/8", timeSig: "6/8", kick: [0, 3], snare: [3], hat: [0, 1, 2, 3, 4, 5] },
  { id: "march", name: "March", timeSig: "2/4", kick: [0], snare: [2], hat: [0, 1, 2, 3] },
];

export function groovesFor(ts: TimeSig): Groove[] {
  return GROOVES.filter((g) => g.timeSig === ts);
}

export function firstGrooveId(ts: TimeSig): string {
  return groovesFor(ts)[0]?.id ?? "";
}

export function grooveById(id: string): Groove | undefined {
  return GROOVES.find((g) => g.id === id);
}

// ----- audio nodes (built lazily after the context is running) -----
let out: Tone.Gain | null = null;
let kick: Tone.MembraneSynth | null = null;
let snare: Tone.NoiseSynth | null = null;
let hat: Tone.MetalSynth | null = null;
let click: Tone.Synth | null = null;

function ensureNodes() {
  if (out) return;
  out = new Tone.Gain(0.9).toDestination();

  kick = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).connect(out);

  const snareFilter = new Tone.Filter(1800, "bandpass").connect(out);
  snare = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.14, sustain: 0 },
  }).connect(snareFilter);

  hat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  }).connect(out);
  hat.volume.value = -14;

  click = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
  }).connect(out);
  click.volume.value = -4;
}

// ----- live config + scheduling -----
let cfg: MetronomeState = { bpm: 96, timeSig: "4/4", mode: "click", grooveId: "rock" };
let loop: Tone.Loop | null = null;
let step = 0;
let onBeat: ((beat: number, accent: boolean, total: number) => void) | null = null;

function applySwing() {
  const g = grooveById(cfg.grooveId);
  const swing = cfg.mode === "groove" && g?.swing ? 0.55 : 0;
  Tone.Transport.swing = swing;
  Tone.Transport.swingSubdivision = "8n";
}

function playGroove(s: number, time: number) {
  const g = grooveById(cfg.grooveId);
  if (!g) return;
  const accent = s === 0 ? 1 : 0.7;
  if (g.kick.includes(s)) kick?.triggerAttackRelease("C1", "8n", time, accent);
  if (g.snare.includes(s)) snare?.triggerAttackRelease("16n", time, accent);
  if (g.hat.includes(s)) hat?.triggerAttackRelease("C6", "32n", time, s === 0 ? 0.6 : 0.4);
}

function playClick(s: number, time: number) {
  const isBeat = s % STEPS_PER_BEAT[cfg.timeSig] === 0;
  if (!isBeat) return;
  click?.triggerAttackRelease(s === 0 ? "A5" : "A4", "32n", time, s === 0 ? 1 : 0.7);
}

export function startMetronome(
  config: MetronomeState,
  beatCb: (beat: number, accent: boolean, total: number) => void
) {
  ensureNodes();
  cfg = { ...config };
  onBeat = beatCb;
  step = 0;
  Tone.Transport.bpm.value = cfg.bpm;
  applySwing();

  loop?.dispose();
  loop = new Tone.Loop((time) => {
    const spb = STEPS_PER_BAR[cfg.timeSig];
    const s = step % spb;

    if (cfg.mode === "groove") playGroove(s, time);
    else playClick(s, time);

    if (s % STEPS_PER_BEAT[cfg.timeSig] === 0) {
      const beat = s / STEPS_PER_BEAT[cfg.timeSig];
      const total = beatsPerBar(cfg.timeSig);
      Tone.Draw.schedule(() => onBeat?.(beat, s === 0, total), time);
    }
    step = (step + 1) % spb;
  }, "8n").start(0);

  Tone.Transport.start();
}

/** Update tempo / time-sig / mode / groove without interrupting playback. */
export function setMetronomeConfig(config: MetronomeState) {
  cfg = { ...config };
  Tone.Transport.bpm.rampTo(cfg.bpm, 0.05);
  applySwing();
}

export function stopMetronome() {
  loop?.dispose();
  loop = null;
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  step = 0;
  onBeat = null;
}

export function isMetronomeRunning(): boolean {
  return loop !== null;
}
