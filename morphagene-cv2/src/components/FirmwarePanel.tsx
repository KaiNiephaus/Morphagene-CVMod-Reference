import { Label } from "./atoms"
import { FW_NOTES } from "../data/firmwareNotes"
import type { CVInput, FirmOpts, Theme } from "../types"
import { MF } from "../theme"

// ── FirmwarePanel ────────────────────────────────────────────────────────────
// Shows firmware toggle buttons for the active input.
// Firmware options are defined per-input in src/data/inputs.ts.

interface FirmwarePanelProps {
  inp:            CVInput
  firmOpts:       FirmOpts
  onOptionChange: (key: string, index: number) => void
  col:            string
  T:              Theme
}

export function FirmwarePanel({ inp, firmOpts, onOptionChange, col, T }: FirmwarePanelProps) {
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
      {inp.firmware.map(fw => {
        const selectedIdx = firmOpts[fw.key as keyof FirmOpts] ?? 0
        return (
          <div key={fw.key} style={{ marginBottom: 14 }}>
            <Label T={T}>{fw.label}</Label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {fw.options.map((opt, i) => {
                const active = selectedIdx === i
                return (
                  <button
                    key={i}
                    onClick={() => onOptionChange(fw.key, i)}
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
              {(FW_NOTES[fw.key] ?? [""])[selectedIdx]}
            </div>
          </div>
        )
      })}
    </div>
  )
}
