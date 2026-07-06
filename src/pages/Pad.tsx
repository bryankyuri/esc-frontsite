import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppContext } from "@/providers/AppContext";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import {
  diatonicPads,
  rootName,
  QUALITY_LABEL,
  type PadAssignment,
} from "@/lib/pad/chords";
import "@/components/pad/pad.css";

const PAD_COUNT = 10;

// Seed the grid with a playable palette: C-major diatonic triads + two colour
// chords, one pad left empty. (Assignment editing arrives in a later milestone.)
function seedPads(): (PadAssignment | null)[] {
  const grid: (PadAssignment | null)[] = [...diatonicPads(0)];
  grid.push({ root: 0, quality: "maj7", octaveShift: 0 }); // Cmaj7
  grid.push({ root: 7, quality: "7", octaveShift: 0 }); // G7
  grid.push(null);
  return grid.slice(0, PAD_COUNT);
}

// Keyboard row 1..9,0 maps to pads 0..9.
const KEY_TO_PAD: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
  "9": 8,
  "0": 9,
};

export default function Pad() {
  const { screenWidth } = useContext(AppContext);
  const isDesktop = screenWidth > 1080;

  const engine = useAudioEngine();

  const [pads] = useState<(PadAssignment | null)[]>(seedPads);
  const [transpose, setTranspose] = useState(0);
  const [instrument, setInstrument] = useState<"piano" | "organ">("piano");
  const [volume, setVolume] = useState(72);
  const [active, setActive] = useState<Set<number>>(() => new Set());

  // Refs so the imperative pointer/keyboard handlers always read fresh values.
  const padsRef = useRef(pads);
  const transposeRef = useRef(transpose);
  padsRef.current = pads;
  transposeRef.current = transpose;

  const press = useCallback(
    (index: number) => {
      const pad = padsRef.current[index];
      if (!pad) return;
      engine.noteOn(index, pad, transposeRef.current);
      setActive((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    },
    [engine]
  );

  const release = useCallback(
    (index: number) => {
      engine.noteOff(index);
      setActive((prev) => {
        if (!prev.has(index)) return prev;
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    },
    [engine]
  );

  // Push instrument / volume changes to the engine (also after unlock).
  useEffect(() => {
    engine.setInstrument(instrument);
  }, [engine, instrument]);
  useEffect(() => {
    engine.setVolume(volume);
  }, [engine, volume]);
  useEffect(() => {
    if (engine.ready) engine.setVolume(volume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.ready]);

  // Physical keyboard: 1..0 play pads, ignoring auto-repeat and text inputs.
  useEffect(() => {
    const down = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const index = KEY_TO_PAD[e.key];
      if (index === undefined || down.has(e.key)) return;
      down.add(e.key);
      press(index);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const index = KEY_TO_PAD[e.key];
      if (index === undefined) return;
      down.delete(e.key);
      release(index);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [press, release]);

  const transposeLabel = useMemo(
    () => (transpose > 0 ? `+${transpose}` : `${transpose}`),
    [transpose]
  );

  return (
    <div
      className={`${isDesktop ? "" : "px-3"} flex min-h-screen flex-col items-center justify-start`}
    >
      <div className="w-full max-w-[1000px] mt-[24px] mb-[48px]">
        <div className={`chordpad ${isDesktop ? "desktop" : "mobile"}`}>
          {/* titlebar */}
          <div className="cp-titlebar">
            <div className="cp-brand">
              <span className="mk">Earhouse</span>
              <span className="sub">Chord Pad</span>
            </div>
            <div className="cp-power">
              <span>Audio</span>
              <span className={`cp-led ${engine.ready ? "" : "off"}`} />
            </div>
          </div>

          {/* deck */}
          <div className="cp-deck">
            {isDesktop ? (
              <div className="cp-rack">
                <InstrumentModule value={instrument} onChange={setInstrument} />
                <TransposeModule
                  label={transposeLabel}
                  onDec={() => setTranspose((v) => Math.max(-11, v - 1))}
                  onInc={() => setTranspose((v) => Math.min(11, v + 1))}
                  onReset={() => setTranspose(0)}
                />
                <VolumeModule value={volume} onChange={setVolume} />
              </div>
            ) : (
              <div className="cp-rack">
                <div className="cp-rack-row">
                  <InstrumentModule
                    value={instrument}
                    onChange={setInstrument}
                  />
                  <TransposeModule
                    label={transposeLabel}
                    onDec={() => setTranspose((v) => Math.max(-11, v - 1))}
                    onInc={() => setTranspose((v) => Math.min(11, v + 1))}
                    onReset={() => setTranspose(0)}
                  />
                </div>
                <VolumeModule value={volume} onChange={setVolume} />
              </div>
            )}

            <div className="cp-grid">
              {pads.map((pad, i) => (
                <PadButton
                  key={i}
                  index={i}
                  pad={pad}
                  transpose={transpose}
                  active={active.has(i)}
                  onPress={press}
                  onRelease={release}
                />
              ))}
            </div>
          </div>

          {!engine.ready && (
            <div className="cp-unlock">
              <div className="title">Chord Pad</div>
              <div className="hint">
                Browsers keep sound off until you tap. Power on the instrument to
                start playing.
              </div>
              <button className="cp-power-btn" onClick={engine.unlock}>
                Tap to power on
              </button>
            </div>
          )}
        </div>

        <p
          className={`text-center text-[12px] opacity-50 mt-3 ${isDesktop ? "" : "px-2"} dark:text-white`}
        >
          Press and hold a pad to play its chord. On a keyboard, use keys 1–0.
        </p>
      </div>
    </div>
  );
}

function PadButton({
  index,
  pad,
  transpose,
  active,
  onPress,
  onRelease,
}: {
  readonly index: number;
  readonly pad: PadAssignment | null;
  readonly transpose: number;
  readonly active: boolean;
  readonly onPress: (i: number) => void;
  readonly onRelease: (i: number) => void;
}) {
  if (!pad) {
    return (
      <div className="cp-pad empty">
        <div className="plus">＋</div>
        <div className="foot">empty</div>
      </div>
    );
  }

  const suffix = QUALITY_LABEL[pad.quality];

  return (
    <div
      className={`cp-pad ${active ? "active" : ""}`}
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onPress(index);
      }}
      onPointerUp={() => onRelease(index)}
      onPointerCancel={() => onRelease(index)}
      onLostPointerCapture={() => onRelease(index)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="idx">
        <span>PAD {index + 1}</span>
        <span>KEY {(index + 1) % 10}</span>
      </div>
      <div className="chord">
        {rootName(pad.root, transpose)}
        {suffix && <sup>{suffix}</sup>}
      </div>
      <div className="foot">{active ? "playing" : "hold"}</div>
    </div>
  );
}

function InstrumentModule({
  value,
  onChange,
}: {
  readonly value: "piano" | "organ";
  readonly onChange: (v: "piano" | "organ") => void;
}) {
  return (
    <div className="cp-module">
      <div className="cp-mlabel">Instrument</div>
      <div className="cp-seg">
        <button
          className={value === "piano" ? "on" : ""}
          onClick={() => onChange("piano")}
        >
          Piano
        </button>
        <button
          className={value === "organ" ? "on" : ""}
          onClick={() => onChange("organ")}
        >
          Organ
        </button>
      </div>
    </div>
  );
}

function TransposeModule({
  label,
  onDec,
  onInc,
  onReset,
}: {
  readonly label: string;
  readonly onDec: () => void;
  readonly onInc: () => void;
  readonly onReset: () => void;
}) {
  return (
    <div className="cp-module">
      <div className="cp-mlabel">
        <span>Transpose</span>
        <span>semitones</span>
      </div>
      <div className="cp-stepper">
        <button className="cp-btn" onClick={onDec} aria-label="Transpose down">
          −
        </button>
        <button
          className="cp-lcd"
          onClick={onReset}
          title="Reset to 0"
          style={{ border: "1px solid #000", cursor: "pointer" }}
        >
          <span className="big">{label}</span>
        </button>
        <button className="cp-btn" onClick={onInc} aria-label="Transpose up">
          +
        </button>
      </div>
    </div>
  );
}

function VolumeModule({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (v: number) => void;
}) {
  return (
    <div className="cp-module">
      <div className="cp-mlabel">Volume</div>
      <div className="cp-fader-row">
        <input
          className="cp-range"
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Master volume"
        />
        <span className="val">{value}</span>
      </div>
    </div>
  );
}
