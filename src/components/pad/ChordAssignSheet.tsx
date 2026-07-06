import { useEffect, useState } from "react";
import {
  labelFor,
  NOTE_NAMES,
  QUALITY_DISPLAY,
  QUALITY_ORDER,
  type PadAssignment,
  type Quality,
} from "@/lib/pad/chords";

const OCTAVES: { value: -1 | 0 | 1; label: string }[] = [
  { value: -1, label: "−1 oct" },
  { value: 0, label: "0" },
  { value: 1, label: "+1 oct" },
];

const DEFAULT: PadAssignment = { root: 0, quality: "maj", octaveShift: 0 };

export function ChordAssignSheet({
  open,
  initial,
  transpose,
  isDesktop,
  onSave,
  onClose,
  onPreviewDown,
  onPreviewUp,
}: {
  readonly open: boolean;
  readonly initial: PadAssignment | null;
  readonly transpose: number;
  readonly isDesktop: boolean;
  readonly onSave: (pad: PadAssignment) => void;
  readonly onClose: () => void;
  readonly onPreviewDown: (pad: PadAssignment) => void;
  readonly onPreviewUp: () => void;
}) {
  const [draft, setDraft] = useState<PadAssignment>(initial ?? DEFAULT);

  // Reset the draft whenever the sheet is (re)opened for a pad.
  useEffect(() => {
    if (open) setDraft(initial ?? DEFAULT);
  }, [open, initial]);

  if (!open) return null;

  const assignedLabel = labelFor(draft, 0);
  const soundsLabel = labelFor(draft, transpose);
  const transposed = transpose !== 0;

  return (
    <div
      className={`cp-backdrop ${isDesktop ? "" : "bottom"}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`chordpad-sheet ${isDesktop ? "" : "bottom"}`}>
        <div className="cp-sheet-head">
          <span className="ttl">{initial ? "Edit pad" : "Assign chord"}</span>
          <button className="cp-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="cp-preview">
          <div>
            <div className="big">{assignedLabel}</div>
            {transposed && (
              <div className="sounds">sounds {soundsLabel} at {transpose > 0 ? `+${transpose}` : transpose}</div>
            )}
          </div>
          <button
            className="cp-hear"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onPreviewDown(draft);
            }}
            onPointerUp={onPreviewUp}
            onPointerCancel={onPreviewUp}
            onLostPointerCapture={onPreviewUp}
          >
            ▸ Hold to hear
          </button>
        </div>

        <div className="cp-field">
          <div className="lbl">Root</div>
          <div className="cp-chip-grid roots">
            {NOTE_NAMES.map((name, i) => (
              <button
                key={i}
                className={`cp-chip ${draft.root === i ? "on" : ""}`}
                onClick={() => setDraft((d) => ({ ...d, root: i }))}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="cp-field">
          <div className="lbl">Quality</div>
          <div className="cp-chip-grid quals">
            {QUALITY_ORDER.map((q: Quality) => (
              <button
                key={q}
                className={`cp-chip ${draft.quality === q ? "on" : ""}`}
                onClick={() => setDraft((d) => ({ ...d, quality: q }))}
              >
                {QUALITY_DISPLAY[q]}
              </button>
            ))}
          </div>
        </div>

        <div className="cp-field">
          <div className="lbl">Octave</div>
          <div className="cp-octave">
            {OCTAVES.map((o) => (
              <button
                key={o.value}
                className={draft.octaveShift === o.value ? "on" : ""}
                onClick={() => setDraft((d) => ({ ...d, octaveShift: o.value }))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cp-sheet-foot">
          <button className="save" onClick={() => onSave(draft)}>
            Save chord
          </button>
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
