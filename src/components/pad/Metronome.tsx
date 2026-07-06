import { useEffect, useRef, useState } from "react";
import {
  beatsPerBar,
  groovesFor,
  grooveById,
  onBeatChange,
} from "@/lib/pad/grooves";
import type { MetronomeState, TimeSig } from "@/lib/pad/presetStorage";

// Isolated so only the LEDs re-render on each beat — never the whole page.
function BeatLeds({ running, total }: { readonly running: boolean; readonly total: number }) {
  const [beat, setBeat] = useState(-1);
  useEffect(() => onBeatChange((b) => setBeat(b)), []);
  useEffect(() => {
    if (!running) setBeat(-1);
  }, [running]);
  return (
    <div className="cp-beats">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`cp-beat-led ${i === 0 ? "accent" : ""} ${
            running && i === beat ? "on" : ""
          }`}
        />
      ))}
    </div>
  );
}

const TIME_SIGS: TimeSig[] = ["2/4", "3/4", "4/4", "6/8"];
const BPM_MIN = 40;
const BPM_MAX = 240;

export function Metronome({
  cfg,
  grooveEnabled,
  onChange,
  running,
  onToggle,
}: {
  readonly cfg: MetronomeState;
  readonly grooveEnabled: boolean;
  readonly onChange: (partial: Partial<MetronomeState>) => void;
  readonly running: boolean;
  readonly onToggle: () => void;
}) {
  const tapsRef = useRef<number[]>([]);

  const setBpm = (v: number) =>
    onChange({ bpm: Math.max(BPM_MIN, Math.min(BPM_MAX, v)) });

  const tap = () => {
    const now = performance.now();
    const taps = tapsRef.current;
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now);
    if (taps.length > 4) taps.shift();
    if (taps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < taps.length; i++) sum += taps[i] - taps[i - 1];
      setBpm(Math.round(60000 / (sum / (taps.length - 1))));
    }
  };

  const grooves = groovesFor(cfg.timeSig);
  const grooveIdx = Math.max(
    0,
    grooves.findIndex((g) => g.id === cfg.grooveId)
  );
  const grooveName = grooveById(cfg.grooveId)?.name ?? "—";

  const stepGroove = (dir: 1 | -1) => {
    if (grooves.length === 0) return;
    const next = (grooveIdx + dir + grooves.length) % grooves.length;
    onChange({ grooveId: grooves[next].id });
  };

  const total = beatsPerBar(cfg.timeSig);

  return (
    <div className="cp-module">
      <div className="cp-mlabel">Metronome</div>

      <div className="cp-metro-tempo">
        <button
          className="cp-btn"
          onClick={() => setBpm(cfg.bpm - 1)}
          aria-label="Tempo down"
        >
          −
        </button>
        <div className="cp-lcd">
          <span className="big">{cfg.bpm}</span>
          <span className="unit">BPM</span>
        </div>
        <button
          className="cp-btn"
          onClick={() => setBpm(cfg.bpm + 1)}
          aria-label="Tempo up"
        >
          +
        </button>
        <button className="cp-tap" onClick={tap}>
          Tap
        </button>
      </div>

      <div className="cp-seg cp-metro-sig">
        {TIME_SIGS.map((ts) => (
          <button
            key={ts}
            className={cfg.timeSig === ts ? "on" : ""}
            onClick={() => onChange({ timeSig: ts })}
          >
            {ts}
          </button>
        ))}
      </div>

      {grooveEnabled && (
        <div className="cp-seg cp-metro-mode">
          <button
            className={cfg.mode === "click" ? "on" : ""}
            onClick={() => onChange({ mode: "click" })}
          >
            Click
          </button>
          <button
            className={cfg.mode === "groove" ? "on" : ""}
            onClick={() => onChange({ mode: "groove" })}
          >
            Groove
          </button>
        </div>
      )}

      {grooveEnabled && cfg.mode === "groove" && (
        <div className="cp-stepper cp-metro-groove">
          <button
            className="cp-btn"
            onClick={() => stepGroove(-1)}
            aria-label="Previous groove"
          >
            ◂
          </button>
          <div className="cp-lcd">
            <span className="groove-name">{grooveName}</span>
          </div>
          <button
            className="cp-btn"
            onClick={() => stepGroove(1)}
            aria-label="Next groove"
          >
            ▸
          </button>
        </div>
      )}

      <div className="cp-metro-vol">
        <span className="lbl">Level</span>
        <input
          className="cp-range"
          type="range"
          min={0}
          max={100}
          value={cfg.volume ?? 80}
          onChange={(e) => onChange({ volume: Number(e.target.value) })}
          aria-label="Metronome level"
        />
      </div>

      <div className="cp-metro-run">
        <BeatLeds running={running} total={total} />
        <button
          className={`cp-runbtn ${running ? "running" : ""}`}
          onClick={onToggle}
        >
          {running ? "■ Stop" : "▸ Run"}
        </button>
      </div>
    </div>
  );
}
