import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppContext } from "@/providers/AppContext";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useMetronome } from "@/hooks/useMetronome";
import { IoInformationCircleOutline } from "react-icons/io5";
import { ChordAssignSheet } from "@/components/pad/ChordAssignSheet";
import { PresetManager } from "@/components/pad/PresetManager";
import { Metronome } from "@/components/pad/Metronome";
import { HelpSheet } from "@/components/pad/HelpSheet";
import { PerfModePicker } from "@/components/pad/PerfModePicker";
import { firstGrooveId, groovesFor } from "@/lib/pad/grooves";
import { loadPerfMode, savePerfMode, type PerfMode } from "@/lib/pad/perfMode";
import {
  diatonicPads,
  rootName,
  NOTE_NAMES,
  QUALITY_LABEL,
  type PadAssignment,
} from "@/lib/pad/chords";
import {
  defaultWorkingState,
  loadStore,
  newPresetId,
  saveStore,
  MAX_PRESETS,
  PAD_COUNT,
  type MetronomeState,
  type Preset,
  type WorkingState,
} from "@/lib/pad/presetStorage";
import "@/components/pad/pad.css";

const PREVIEW_INDEX = 100; // reserved engine slot for the assign-sheet preview

interface Slot {
  id: string;
  pad: PadAssignment | null;
}

let idCounter = 0;
const newId = () => `pad-${idCounter++}`;

const toSlots = (pads: (PadAssignment | null)[]): Slot[] =>
  pads.map((pad) => ({ id: newId(), pad }));

const KEY_TO_PAD: Record<string, number> = {
  "1": 0, "2": 1, "3": 2, "4": 3, "5": 4,
  "6": 5, "7": 6, "8": 7, "9": 8, "0": 9,
};

export default function Pad() {
  const { screenWidth } = useContext(AppContext);
  const isDesktop = screenWidth > 1080;
  const engine = useAudioEngine();

  // Load persisted store once; restore the last working state (saved or not).
  const [store] = useState(loadStore);
  const initial = store.activeState ?? defaultWorkingState();

  const [slots, setSlots] = useState<Slot[]>(() => toSlots(initial.pads));
  const [transpose, setTranspose] = useState(initial.transpose);
  const [instrument, setInstrument] = useState(initial.instrument);
  const [volume, setVolume] = useState(initial.volume);
  const [metronome, setMetronome] = useState(initial.metronome);
  const [active, setActive] = useState<Set<number>>(() => new Set());
  const [editMode, setEditMode] = useState(false);
  const [assignIndex, setAssignIndex] = useState<number | null>(null);
  const [keyPickerOpen, setKeyPickerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [perfMode, setPerfMode] = useState<PerfMode | null>(loadPerfMode);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const [presets, setPresets] = useState<Preset[]>(store.presets);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const slotsRef = useRef(slots);
  const transposeRef = useRef(transpose);
  slotsRef.current = slots;
  transposeRef.current = transpose;

  // ----- persistence & presets -----
  const workingState: WorkingState = useMemo(
    () => ({
      pads: slots.map((s) => s.pad),
      instrument,
      transpose,
      volume,
      metronome,
    }),
    [slots, instrument, transpose, volume, metronome]
  );

  const storeRef = useRef(store);

  // Debounced write of the live working state — reopening restores exactly
  // where you were, whether or not it was saved as a preset.
  useEffect(() => {
    const t = setTimeout(() => {
      storeRef.current = { ...storeRef.current, activeState: workingState };
      saveStore(storeRef.current);
    }, 300);
    return () => clearTimeout(t);
  }, [workingState]);

  // Persist the preset list whenever it changes.
  useEffect(() => {
    storeRef.current = { ...storeRef.current, presets };
    saveStore(storeRef.current);
  }, [presets]);

  const currentPreset = presets.find((p) => p.id === currentId) ?? null;
  const dirty =
    !currentPreset ||
    JSON.stringify(currentPreset.state) !== JSON.stringify(workingState);

  const applyState = (s: WorkingState) => {
    setSlots(toSlots(s.pads));
    setInstrument(s.instrument);
    setTranspose(s.transpose);
    setVolume(s.volume);
    setMetronome(s.metronome);
  };

  const loadPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    applyState(p.state);
    setCurrentId(id);
    setManagerOpen(false);
  };

  const saveAs = (name: string) => {
    if (presets.length >= MAX_PRESETS) return;
    const now = new Date().toISOString();
    const p: Preset = {
      id: newPresetId(),
      name,
      createdAt: now,
      updatedAt: now,
      state: workingState,
    };
    setPresets((prev) => [...prev, p]);
    setCurrentId(p.id);
  };

  // Create an empty preset and make it the active board (keeps the current
  // instrument/volume so it still sounds the same; clears pads, resets transpose).
  const addBlank = (name: string) => {
    if (presets.length >= MAX_PRESETS) return;
    const blank: WorkingState = {
      pads: new Array<PadAssignment | null>(PAD_COUNT).fill(null),
      instrument,
      transpose: 0,
      volume,
      metronome,
    };
    const now = new Date().toISOString();
    const p: Preset = {
      id: newPresetId(),
      name,
      createdAt: now,
      updatedAt: now,
      state: blank,
    };
    setPresets((prev) => [...prev, p]);
    setCurrentId(p.id);
    applyState(blank);
  };

  const overwriteCurrent = () => {
    if (!currentId) {
      setManagerOpen(true);
      return;
    }
    const now = new Date().toISOString();
    setPresets((prev) =>
      prev.map((p) =>
        p.id === currentId ? { ...p, state: workingState, updatedAt: now } : p
      )
    );
  };

  const renamePreset = (id: string, name: string) =>
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));

  const deletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (id === currentId) setCurrentId(null);
  };

  const stepPreset = (dir: 1 | -1) => {
    if (presets.length === 0) return;
    const idx = presets.findIndex((p) => p.id === currentId);
    const next =
      idx === -1
        ? dir === 1
          ? 0
          : presets.length - 1
        : (idx + dir + presets.length) % presets.length;
    loadPreset(presets[next].id);
  };

  // ----- metronome (gated by performance tier) -----
  const grooveEnabled = perfMode === "full";
  const metroEnabled = perfMode !== "lite";

  // In non-full tiers, force the click sound regardless of the saved groove.
  const effectiveMetro: MetronomeState = grooveEnabled
    ? metronome
    : { ...metronome, mode: "click" };
  const metro = useMetronome(effectiveMetro);

  const updateMetro = (partial: Partial<MetronomeState>) => {
    setMetronome((prev) => {
      const next = { ...prev, ...partial };
      // Keep the selected groove valid for the current time signature.
      if (!groovesFor(next.timeSig).some((g) => g.id === next.grooveId)) {
        next.grooveId = firstGrooveId(next.timeSig);
      }
      return next;
    });
  };

  const toggleMetro = async () => {
    if (!metroEnabled) return;
    if (!engine.ready) await engine.unlock();
    metro.toggle();
  };

  // Switching tier changes the audio graph, so reload for a clean start.
  const changePerfMode = (m: PerfMode) => {
    savePerfMode(m);
    location.reload();
  };

  const press = useCallback(
    (index: number) => {
      const pad = slotsRef.current[index]?.pad;
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

  // Preview handlers for the assign sheet (uses a reserved engine slot).
  const previewDown = useCallback(
    (pad: PadAssignment) => engine.noteOn(PREVIEW_INDEX, pad, transposeRef.current),
    [engine]
  );
  const previewUp = useCallback(() => engine.noteOff(PREVIEW_INDEX), [engine]);

  // Stable ref so the keyboard listener can toggle the metronome without
  // re-subscribing on every render.
  const toggleMetroRef = useRef<() => void | Promise<void>>(() => {});
  toggleMetroRef.current = toggleMetro;

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

  // Entering edit mode silences anything held.
  useEffect(() => {
    if (editMode) {
      engine.releaseAll();
      setActive((prev) => (prev.size ? new Set() : prev));
    }
  }, [editMode, engine]);

  // Track connectivity so we can reassure the user Chord Pad still works offline.
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Mobile browsers suspend the audio context when the tab is backgrounded and
  // it often won't cleanly resume, leaving the pads silent. Rather than fight
  // it, reload on return once audio has been powered on — the board is
  // auto-saved, so nothing is lost (you just tap "power on" again).
  useEffect(() => {
    const wentAway = { current: false };
    const onVis = () => {
      if (document.hidden) {
        wentAway.current = true;
      } else if (wentAway.current && engine.ready) {
        location.reload();
      }
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [engine.ready]);

  // Lock page scroll while a full-cover overlay is up (power-on gate, assign
  // sheet, key picker) so mobile can't scroll the page behind it.
  useEffect(() => {
    const locked =
      perfMode === null ||
      !engine.ready ||
      assignIndex !== null ||
      keyPickerOpen ||
      managerOpen ||
      helpOpen;
    if (!locked) return;
    const { overflow, overscrollBehavior } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.overscrollBehavior = overscrollBehavior;
    };
  }, [perfMode, engine.ready, assignIndex, keyPickerOpen, managerOpen, helpOpen]);

  // Physical keyboard: 1..0 play pads (disabled while editing / sheet open).
  useEffect(() => {
    if (editMode || assignIndex !== null || keyPickerOpen) return;
    const down = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!down.has("Space")) {
          down.add("Space");
          toggleMetroRef.current();
        }
        return;
      }
      const index = KEY_TO_PAD[e.key];
      if (index === undefined || down.has(e.key)) return;
      down.add(e.key);
      press(index);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        down.delete("Space");
        return;
      }
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
  }, [editMode, assignIndex, keyPickerOpen, press, release]);

  // Drag starts as soon as the pointer moves a few pixels — the whole pad body
  // is the handle. Editing is via the pencil badge, so there's no tap/drag clash.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    setSlots((prev) => {
      const from = prev.findIndex((s) => s.id === a.id);
      const to = prev.findIndex((s) => s.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  };

  const saveAssignment = (pad: PadAssignment) => {
    if (assignIndex === null) return;
    const idx = assignIndex;
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, pad } : s)));
    setAssignIndex(null);
  };

  const clearPad = (index: number) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, pad: null } : s)));

  const fillFromKey = (keyRoot: number) => {
    const diat = diatonicPads(keyRoot);
    setSlots((prev) =>
      prev.map((s, i) => ({ ...s, pad: i < diat.length ? diat[i] : null }))
    );
    setKeyPickerOpen(false);
  };

  const transposeLabel = useMemo(
    () => (transpose > 0 ? `+${transpose}` : `${transpose}`),
    [transpose]
  );

  return (
    <div
      className={`cp-page ${isDesktop ? "" : "px-3"} flex min-h-screen flex-col items-center justify-start`}
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
              {!online && (
                <span className="cp-offline" title="You're offline — Chord Pad still works">
                  Offline
                </span>
              )}
              <button
                className="cp-icon-btn"
                onClick={() => setHelpOpen(true)}
                aria-label="How to use"
                title="How to use"
              >
                <IoInformationCircleOutline />
              </button>
              <button
                className={`cp-icon-btn ${editMode ? "on" : ""}`}
                onClick={() => setEditMode((v) => !v)}
                aria-label="Edit pads"
                title="Edit pads"
              >
                ⚙
              </button>
              <span>Audio</span>
              <span className={`cp-led ${engine.ready ? "" : "off"}`} />
            </div>
          </div>

          {/* preset bar */}
          <div className="cp-presetbar">
            <button
              className="cp-btn nav"
              onClick={() => stepPreset(-1)}
              disabled={presets.length === 0}
              aria-label="Previous preset"
            >
              ◂
            </button>
            <div className="cp-preset-lcd">
              <span className="name">
                {currentPreset ? currentPreset.name : "Unsaved sketch"}
                {dirty && <span className="dirty" title="Unsaved changes">●</span>}
              </span>
              <span className="slot">
                {currentPreset
                  ? `PRESET ${presets.findIndex((p) => p.id === currentId) + 1}/${presets.length}`
                  : `${presets.length}/${MAX_PRESETS} SAVED`}
              </span>
            </div>
            <button
              className="cp-btn nav"
              onClick={() => stepPreset(1)}
              disabled={presets.length === 0}
              aria-label="Next preset"
            >
              ▸
            </button>
            <button
              className="cp-preset-save"
              onClick={overwriteCurrent}
              disabled={!!currentPreset && !dirty}
            >
              {currentId ? "Save" : "Save as"}
            </button>
            <button
              className="cp-btn"
              onClick={() => setManagerOpen(true)}
              aria-label="Manage presets"
            >
              ⋯
            </button>
          </div>

          {editMode && (
            <div className="cp-edittools">
              <span className="hint">Edit — tap a pad to assign · drag to reorder</span>
              <button className="cp-tool-btn" onClick={() => setKeyPickerOpen(true)}>
                Fill from key
              </button>
              <button className="cp-tool-btn primary" onClick={() => setEditMode(false)}>
                Done
              </button>
            </div>
          )}

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
                {metroEnabled && (
                  <Metronome
                    cfg={effectiveMetro}
                    grooveEnabled={grooveEnabled}
                    onChange={updateMetro}
                    running={metro.running}
                    onToggle={toggleMetro}
                  />
                )}
              </div>
            ) : (
              <div className="cp-rack">
                <div className="cp-rack-row">
                  <InstrumentModule value={instrument} onChange={setInstrument} />
                  <TransposeModule
                    label={transposeLabel}
                    onDec={() => setTranspose((v) => Math.max(-11, v - 1))}
                    onInc={() => setTranspose((v) => Math.min(11, v + 1))}
                    onReset={() => setTranspose(0)}
                  />
                </div>
                <VolumeModule value={volume} onChange={setVolume} />
                {metroEnabled && (
                  <Metronome
                    cfg={effectiveMetro}
                    grooveEnabled={grooveEnabled}
                    onChange={updateMetro}
                    running={metro.running}
                    onToggle={toggleMetro}
                  />
                )}
              </div>
            )}

            {editMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={slots.map((s) => s.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="cp-grid">
                    {slots.map((slot, i) => (
                      <SortablePad
                        key={slot.id}
                        slot={slot}
                        index={i}
                        transpose={transpose}
                        onEdit={() => setAssignIndex(i)}
                        onClear={() => clearPad(i)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="cp-grid">
                {slots.map((slot, i) => (
                  <PlayPad
                    key={slot.id}
                    index={i}
                    pad={slot.pad}
                    transpose={transpose}
                    active={active.has(i)}
                    onPress={press}
                    onRelease={release}
                  />
                ))}
              </div>
            )}
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
          Press and hold a pad to play its chord. Keys 1–0 on a keyboard. Tap ⚙ to
          edit, reorder, or fill from a key.
        </p>
      </div>

      <ChordAssignSheet
        open={assignIndex !== null}
        initial={assignIndex !== null ? slots[assignIndex].pad : null}
        transpose={transpose}
        isDesktop={isDesktop}
        onSave={saveAssignment}
        onClose={() => {
          previewUp();
          setAssignIndex(null);
        }}
        onPreviewDown={previewDown}
        onPreviewUp={previewUp}
      />

      {keyPickerOpen && (
        <KeyPicker
          isDesktop={isDesktop}
          onPick={fillFromKey}
          onClose={() => setKeyPickerOpen(false)}
        />
      )}

      {helpOpen && (
        <HelpSheet
          isDesktop={isDesktop}
          perfMode={perfMode}
          onChangePerfMode={changePerfMode}
          onClose={() => setHelpOpen(false)}
        />
      )}

      {perfMode === null && (
        <PerfModePicker
          isDesktop={isDesktop}
          onPick={(m) => {
            savePerfMode(m);
            setPerfMode(m);
          }}
        />
      )}

      {managerOpen && (
        <PresetManager
          isDesktop={isDesktop}
          presets={presets}
          currentId={currentId}
          onLoad={loadPreset}
          onRename={renamePreset}
          onDelete={deletePreset}
          onSaveAs={saveAs}
          onNewBlank={addBlank}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- pads ---------- */

function ChordFace({
  pad,
  transpose,
}: {
  readonly pad: PadAssignment;
  readonly transpose: number;
}) {
  const suffix = QUALITY_LABEL[pad.quality];
  return (
    <div className="chord">
      {rootName(pad.root, transpose)}
      {suffix && <sup>{suffix}</sup>}
    </div>
  );
}

const PlayPad = memo(function PlayPad({
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
      <ChordFace pad={pad} transpose={transpose} />
      <div className="foot">{active ? "playing" : "hold"}</div>
    </div>
  );
});

function SortablePad({
  slot,
  index,
  transpose,
  onEdit,
  onClear,
}: {
  readonly slot: Slot;
  readonly index: number;
  readonly transpose: number;
  readonly onEdit: () => void;
  readonly onClear: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const pad = slot.pad;

  // The whole pad body is the drag handle; the pencil badge edits. Badges stop
  // the pointer from starting a drag so they stay tappable.
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cp-pad editing ${pad ? "" : "empty"} ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      {pad && (
        <button
          className="cp-badge del"
          onPointerDown={stopDrag}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`Clear pad ${index + 1}`}
        >
          ✕
        </button>
      )}
      <button
        className="cp-badge pen"
        onPointerDown={stopDrag}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        aria-label={`Edit pad ${index + 1}`}
      >
        ✎
      </button>

      {pad ? (
        <>
          <div className="idx">
            <span>PAD {index + 1}</span>
          </div>
          <ChordFace pad={pad} transpose={transpose} />
        </>
      ) : (
        <div className="plus">＋</div>
      )}

      <div className="cp-grip" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

/* ---------- rack modules ---------- */

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

/* ---------- key picker (diatonic auto-fill) ---------- */

function KeyPicker({
  isDesktop,
  onPick,
  onClose,
}: {
  readonly isDesktop: boolean;
  readonly onPick: (keyRoot: number) => void;
  readonly onClose: () => void;
}) {
  return (
    <div
      className={`cp-backdrop ${isDesktop ? "" : "bottom"}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`chordpad-sheet ${isDesktop ? "" : "bottom"}`}>
        <div className="cp-sheet-head">
          <span className="ttl">Fill pads from key</span>
          <button className="cp-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="cp-field">
          <div className="lbl">Major key — fills pads 1–7 with its chords</div>
          <div className="cp-chip-grid keys">
            {NOTE_NAMES.map((name, i) => (
              <button key={i} className="cp-chip" onClick={() => onPick(i)}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
