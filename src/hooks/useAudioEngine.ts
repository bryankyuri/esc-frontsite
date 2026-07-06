// React binding for the Chord Pad audio engine. Exposes the imperative engine
// plus a `ready` flag and an `unlock` gesture handler (browser autoplay policy).

import { useCallback, useEffect, useMemo, useState } from "react";
import * as engine from "@/lib/pad/audioEngine";

export function useAudioEngine() {
  const [ready, setReady] = useState(engine.isStarted());

  const unlock = useCallback(async () => {
    await engine.ensureStarted();
    setReady(true);
  }, []);

  // Release everything and re-sync context if the tab is hidden mid-play
  // (iOS suspends the audio context in the background).
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) engine.releaseAll();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      engine.releaseAll();
    };
  }, []);

  // Stable identity so effects that depend on the engine don't re-run every
  // render. The imperative methods are module-level and already stable; only
  // `ready` changes, and then only once.
  return useMemo(
    () => ({
      ready,
      unlock,
      noteOn: engine.noteOn,
      noteOff: engine.noteOff,
      releaseAll: engine.releaseAll,
      setInstrument: engine.setInstrument,
      setVolume: engine.setVolume,
    }),
    [ready, unlock]
  );
}
