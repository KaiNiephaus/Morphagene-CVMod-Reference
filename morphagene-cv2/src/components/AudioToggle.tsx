// ── AudioToggle ──────────────────────────────────────────────────────────────
// Button that enables / disables the Web Audio engine.
// Must be triggered by a user gesture to satisfy browser autoplay policy.

import type { Theme } from "../types"
import { MF } from "../theme"

interface AudioToggleProps {
  audioEnabled: boolean
  onToggle:     () => void
  T:            Theme
}

export function AudioToggle({ audioEnabled, onToggle, T }: AudioToggleProps) {
  return (
    <button
      onClick={onToggle}
      title={audioEnabled ? "Disable audio preview" : "Enable audio preview — hear how CV affects sound"}
      style={{
        background: audioEnabled ? "#ff9800" + "22" : T.surface2,
        border: `1px solid ${audioEnabled ? "#ff9800" : T.border}`,
        color: audioEnabled ? "#ff9800" : T.muted,
        padding: "5px 13px", cursor: "pointer", borderRadius: 3,
        fontFamily: MF, fontSize: 11, letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 7,
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 13 }}>{audioEnabled ? "🔊" : "🔇"}</span>
      {audioEnabled ? "AUDIO ON" : "AUDIO OFF"}
    </button>
  )
}
