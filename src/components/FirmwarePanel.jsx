import { Label } from "./atoms.jsx"
import { FW_NOTES } from "../data/firmwareNotes.js"

const MF = "'DM Mono','Fira Code',monospace"

// ── FirmwarePanel ────────────────────────────────────────────────────────────
// Shows firmware toggle buttons for the active input.
// Firmware options are defined per-input in src/data/inputs.js.

export function FirmwarePanel({ inp, firmOpts, setFirmOpts, col, T }) {
  if (!inp.firmware.length) {
    return (
      <div style={{
        padding: "12px 14px", background: T.surface2,
        border: `1px solid ${T.border}`, borderRadius: 3,
        fontFamily: MF, fontSize: 12, color: T.muted,
      }}>
        No firmware options for {inp.label}
      </div>
    )
  }

  return (
    <div>
      {inp.firmware.map(fw => (
        <div key={fw.key} style={{ marginBottom: 14 }}>
          <Label T={T}>{fw.label}</Label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {fw.options.map((opt, i) => {
              const active = (firmOpts[fw.key] || 0) === i
              return (
                <button
                  key={i}
                  onClick={() => setFirmOpts(p => ({ ...p, [fw.key]: i }))}
                  style={{
                    background: active ? col + "22" : T.surface2,
                    border: `1px solid ${active ? col : T.border}`,
                    color: active ? col : T.muted,
                    padding: "6px 11px", borderRadius: 2, cursor: "pointer",
                    fontFamily: MF, fontSize: 11, letterSpacing: "0.04em",
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          <div style={{
            padding: "8px 11px", background: T.dim, borderRadius: 2,
            fontFamily: MF, fontSize: 11, color: T.muted, lineHeight: 1.65,
          }}>
            {(FW_NOTES[fw.key] || [""])[firmOpts[fw.key] || 0]}
          </div>
        </div>
      ))}
    </div>
  )
}
