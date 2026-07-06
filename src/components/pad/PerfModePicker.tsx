import { PERF_OPTIONS, type PerfMode } from "@/lib/pad/perfMode";

// First-run chooser (and re-chooser) for the performance tier. `current` marks
// the active option when re-opening from the guide.
export function PerfModePicker({
  isDesktop,
  current,
  onPick,
  onClose,
}: {
  readonly isDesktop: boolean;
  readonly current?: PerfMode;
  readonly onPick: (mode: PerfMode) => void;
  readonly onClose?: () => void;
}) {
  return (
    <div className={`cp-backdrop ${isDesktop ? "" : "full"}`}>
      <div className={`chordpad cp-perf ${isDesktop ? "" : "full"}`}>
        <div className="cp-help-head">
          <div className="cp-brand">
            <span className="mk">Choose a mode</span>
            <span className="sub">Chord Pad</span>
          </div>
          {onClose && (
            <button className="cp-help-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        <div className="cp-perf-body">
          <p className="cp-perf-intro">
            Older or budget phones can crackle when there's too much going on.
            Pick what you need — you can change this anytime from the guide, and
            the page will reload.
          </p>
          {PERF_OPTIONS.map((o) => (
            <button
              key={o.id}
              className={`cp-perf-card ${current === o.id ? "current" : ""}`}
              onClick={() => onPick(o.id)}
            >
              <div className="cp-perf-card-head">
                <span className="title">{o.title}</span>
                <span className="perf">{o.perf}</span>
              </div>
              <p className="desc">{o.desc}</p>
              {current === o.id && <span className="cp-perf-badge">Current</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
