import { useState } from "react";
import { MAX_PRESETS, NAME_MAX, type Preset } from "@/lib/pad/presetStorage";

export function PresetManager({
  isDesktop,
  presets,
  currentId,
  onLoad,
  onRename,
  onDelete,
  onSaveAs,
  onNewBlank,
  onClose,
}: {
  readonly isDesktop: boolean;
  readonly presets: Preset[];
  readonly currentId: string | null;
  readonly onLoad: (id: string) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onSaveAs: (name: string) => void;
  readonly onNewBlank: (name: string) => void;
  readonly onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const atLimit = presets.length >= MAX_PRESETS;

  const commitSaveAs = () => {
    const name = newName.trim();
    if (!name || atLimit) return;
    onSaveAs(name);
    setNewName("");
  };

  const commitBlank = () => {
    if (atLimit) return;
    onNewBlank(newName.trim() || "Blank preset");
    setNewName("");
    onClose();
  };

  const commitRename = (id: string) => {
    const name = renameDraft.trim();
    if (name) onRename(id, name);
    setRenamingId(null);
  };

  return (
    <div
      className={`cp-backdrop ${isDesktop ? "" : "bottom"}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`chordpad-sheet ${isDesktop ? "" : "bottom"}`}>
        <div className="cp-sheet-head">
          <span className="ttl">Presets · {presets.length}/{MAX_PRESETS}</span>
          <button className="cp-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="cp-field">
          <div className="lbl">New preset</div>
          <div className="cp-saveas">
            <input
              className="cp-name-input"
              type="text"
              value={newName}
              maxLength={NAME_MAX}
              placeholder={atLimit ? "Preset limit reached" : "Preset name…"}
              disabled={atLimit}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSaveAs()}
            />
            <button
              className="cp-saveas-btn"
              onClick={commitSaveAs}
              disabled={atLimit || !newName.trim()}
            >
              Save current
            </button>
          </div>
          <button className="cp-blank-btn" onClick={commitBlank} disabled={atLimit}>
            ＋ New blank preset (empty pads)
          </button>
          {atLimit && (
            <div className="cp-note-line">Delete a preset to free a slot.</div>
          )}
        </div>

        <div className="cp-field">
          <div className="lbl">Saved presets</div>
          {presets.length === 0 ? (
            <div className="cp-empty-line">No presets yet.</div>
          ) : (
            <ul className="cp-preset-list">
              {presets.map((p) => (
                <li
                  key={p.id}
                  className={`cp-preset-row ${p.id === currentId ? "current" : ""}`}
                >
                  {renamingId === p.id ? (
                    <input
                      className="cp-name-input flex1"
                      type="text"
                      value={renameDraft}
                      maxLength={NAME_MAX}
                      autoFocus
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(p.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => commitRename(p.id)}
                    />
                  ) : (
                    <button className="cp-preset-name" onClick={() => onLoad(p.id)}>
                      {p.id === currentId && <span className="dot" />}
                      {p.name}
                    </button>
                  )}
                  <button
                    className="cp-row-btn"
                    aria-label={`Rename ${p.name}`}
                    onClick={() => {
                      setRenamingId(p.id);
                      setRenameDraft(p.name);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="cp-row-btn del"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => onDelete(p.id)}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
