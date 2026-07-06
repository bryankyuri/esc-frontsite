// Performance tier — lets users on low-end phones trade features for smoother
// audio. Stored separately from presets (it's a device setting, not song data).

export type PerfMode = "lite" | "metro" | "full";

const KEY = "esc.pad.perf";

export interface PerfOption {
  id: PerfMode;
  title: string;
  desc: string;
  perf: string;
}

export const PERF_OPTIONS: PerfOption[] = [
  {
    id: "lite",
    title: "Only pads",
    desc: "Just the chord pads — no metronome, no drums. The lightest option; pick this if you hear any crackle or lag.",
    perf: "Best performance",
  },
  {
    id: "metro",
    title: "Pads + metronome",
    desc: "Chord pads with a click metronome (tempo and time signature). No drum grooves.",
    perf: "Balanced",
  },
  {
    id: "full",
    title: "Full",
    desc: "Everything: pads, metronome, and drum grooves. Needs more power — may crackle on older phones.",
    perf: "All features · heaviest",
  },
];

export function loadPerfMode(): PerfMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "lite" || v === "metro" || v === "full" ? v : null;
  } catch {
    return null;
  }
}

export function savePerfMode(mode: PerfMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage disabled — ignore */
  }
}
