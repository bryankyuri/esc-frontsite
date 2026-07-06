// React binding for the metronome/groove engine. Owns run state and the current
// beat (for the LEDs); pushes live config changes down while running.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureStarted } from "@/lib/pad/audioEngine";
import {
  setMetronomeConfig,
  startMetronome,
  stopMetronome,
} from "@/lib/pad/grooves";
import type { MetronomeState } from "@/lib/pad/presetStorage";

export function useMetronome(cfg: MetronomeState) {
  const [running, setRunning] = useState(false);

  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Keep the screen awake while the metronome runs so the phone doesn't sleep
  // mid-idea. Progressive enhancement — silently no-op where unsupported.
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const acquireWake = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* denied / unsupported — ignore */
    }
  }, []);
  const releaseWake = useCallback(() => {
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  }, []);

  // Live-update the engine when config changes mid-run.
  useEffect(() => {
    if (running) setMetronomeConfig(cfg);
  }, [cfg, running]);

  // Re-acquire the wake lock after the tab returns to foreground.
  useEffect(() => {
    if (!running) return;
    const onVisible = () => {
      if (!document.hidden && !wakeRef.current) acquireWake();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, acquireWake]);

  const toggle = useCallback(async () => {
    if (running) {
      stopMetronome();
      releaseWake();
      setRunning(false);
    } else {
      await ensureStarted();
      startMetronome(cfgRef.current);
      acquireWake();
      setRunning(true);
    }
  }, [running, acquireWake, releaseWake]);

  // Stop on unmount.
  useEffect(() => {
    return () => {
      stopMetronome();
      releaseWake();
    };
  }, [releaseWake]);

  return useMemo(() => ({ running, toggle }), [running, toggle]);
}
