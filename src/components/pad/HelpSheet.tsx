import { IoCloseOutline } from "react-icons/io5";
import { PERF_OPTIONS, type PerfMode } from "@/lib/pad/perfMode";

// A how-to guide. Each row pairs a live copy of the real control with a short
// explanation, so it's obvious which button the text is talking about.

function Row({
  demo,
  title,
  children,
}: {
  readonly demo: React.ReactNode;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="cp-help-row">
      <div className="cp-help-demo">{demo}</div>
      <div className="cp-help-text">
        <b>{title}</b>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function HelpSheet({
  isDesktop,
  perfMode,
  onChangePerfMode,
  onClose,
}: {
  readonly isDesktop: boolean;
  readonly perfMode: PerfMode | null;
  readonly onChangePerfMode: (mode: PerfMode) => void;
  readonly onClose: () => void;
}) {
  return (
    <div
      className={`cp-backdrop ${isDesktop ? "" : "full"}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`chordpad cp-help ${isDesktop ? "" : "full"}`}>
        <div className="cp-help-head">
          <div className="cp-brand">
            <span className="mk">Chord Pad</span>
          </div>
          <button
            className="cp-help-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IoCloseOutline />
          </button>
        </div>
        
        <div className="cp-help-body">
          <div className="cp-help-perf">
            <b>Performance mode</b>
            <p>
              If you hear crackle or lag on an older phone, switch to a lighter
              mode. Changing this reloads the page.
            </p>
            <div className="cp-perf-switch">
              {PERF_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  className={`cp-perf-pill ${perfMode === o.id ? "current" : ""}`}
                  onClick={() => perfMode !== o.id && onChangePerfMode(o.id)}
                >
                  <span className="t">{o.title}</span>
                  <span className="p">{o.perf}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="w-full my-2">HOW TO USE</div>
          <Row
            title="Power on the sound"
            demo={
              <span className="cp-help-inline">
                <span className="cp-led" /> Audio
              </span>
            }
          >
            Browsers keep sound off until you tap. Your first tap powers on the
            instrument — the dot turns amber when it's ready.
          </Row>

          <Row
            title="Play a chord"
            demo={
              <>
                <span className="cp-help-pad">
                  Em<sup>7</sup>
                </span>
                <span className="cp-help-pad active">F♯m</span>
              </>
            }
          >
            Press and hold a pad to play its chord; let go to stop. You can hold
            two pads at once with two fingers.
          </Row>

          <Row
            title="Keyboard shortcuts"
            demo={
              <span className="cp-help-inline">
                {["1", "2", "3", "…", "0"].map((k) => (
                  <span key={k} className="cp-key">
                    {k}
                  </span>
                ))}
              </span>
            }
          >
            On a computer, number keys <b>1–0</b> play the ten pads, and the
            <b> spacebar</b> starts or stops the metronome.
          </Row>

          <Row
            title="Instrument"
            demo={
              <div className="cp-seg cp-help-seg">
                <button className="on" type="button">
                  Piano
                </button>
                <button type="button">Organ</button>
              </div>
            }
          >
            Switch between Piano and Organ for every pad.
          </Row>

          <Row
            title="Transpose"
            demo={
              <div className="cp-stepper cp-help-stepper">
                <span className="cp-btn">−</span>
                <span className="cp-lcd">
                  <span className="big">+2</span>
                </span>
                <span className="cp-btn">+</span>
              </div>
            }
          >
            Shift every pad up or down in semitones — handy for matching your
            singing range. The pad labels update to what you'll actually hear.
            Tap the number to reset to 0.
          </Row>

          <Row
            title="Edit, reorder, and clear pads"
            demo={
              <span className="cp-help-inline">
                <span className="cp-icon-btn on">⚙</span>
                <span className="cp-badge pen">✎</span>
                <span className="cp-badge del">✕</span>
              </span>
            }
          >
            Tap the <b>gear</b> to enter edit mode. Then drag a pad to reorder
            it, tap <b>✎</b> to change its chord, <b>✕</b> to clear it, or{" "}
            <b>＋</b> to fill an empty pad. Tap Done when finished.
          </Row>

          <Row
            title="Fill from a key"
            demo={<span className="cp-tool-btn">Fill from key</span>}
          >
            While editing, pick a key and pads 1–7 are instantly filled with all
            of that key's chords — a full palette in two taps.
          </Row>

          <Row
            title="Presets"
            demo={
              <span className="cp-help-inline">
                <span className="cp-btn nav">◂</span>
                <span className="cp-preset-save">Save</span>
                <span className="cp-btn nav">▸</span>
                <span className="cp-btn">⋯</span>
              </span>
            }
          >
            Save your board as a preset (up to 10). Use <b>◂ ▸</b> to switch
            between them and <b>⋯</b> to rename, delete, or start a blank
            preset. An amber dot on the name means you have unsaved changes. Ten
            starter progressions come built in.
          </Row>

          <Row
            title="Metronome & grooves"
            demo={
              <span className="cp-help-inline">
                <span className="cp-beats">
                  <span className="cp-beat-led accent on" />
                  <span className="cp-beat-led" />
                  <span className="cp-beat-led" />
                  <span className="cp-beat-led" />
                </span>
                <span className="cp-runbtn">▸ Run</span>
              </span>
            }
          >
            Set the tempo (or <b>Tap</b> it), choose a time signature, then keep
            a plain <b>Click</b> or a drum <b>Groove</b>. It plays in time while
            you work out the chords.
          </Row>

          <Row
            title="Your work is saved"
            demo={<span className="cp-help-save">✓</span>}
          >
            Everything is stored on this device automatically and restored when
            you come back — even before you name a preset.
          </Row>
        </div>
      </div>
    </div>
  );
}
