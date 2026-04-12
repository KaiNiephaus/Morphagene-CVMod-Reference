import type { Theme } from "../types"
import { MF } from "../theme"

// ── Morph stage definitions ──────────────────────────────────────────────────
interface GrainSlot { l: number; w: number }
interface MorphStage { label: string; col: string; grains: GrainSlot[] }

const MORPH_STAGES: MorphStage[] = [
  { label: "Gap / Silence",        col: "#546e7a", grains: [] },
  { label: "Seamless Loop",        col: "#26c6da", grains: [{ l: 0,  w: 68 }] },
  { label: "2× Overlap",           col: "#66bb6a", grains: [{ l: 0,  w: 62 }, { l: 32, w: 62 }] },
  { label: "3× Overlap + Panning", col: "#ffa726", grains: [{ l: 0,  w: 56 }, { l: 22, w: 56 }, { l: 44, w: 56 }] },
  { label: "4× + Pitch Scatter",   col: "#dd44ff", grains: [{ l: 0,  w: 50 }, { l: 13, w: 50 }, { l: 26, w: 50 }, { l: 39, w: 50 }] },
]

// ── GrainOverlapViz ──────────────────────────────────────────────────────────
// Shows layered grain bars for the current Morph stage.
// Responds to gnsm firmware toggle (hard vs smooth grain edges).

interface GrainOverlapVizProps {
  stage: number
  gnsm:  number
  T:     Theme
}

export function GrainOverlapViz({ stage, gnsm, T }: GrainOverlapVizProps) {
  const info   = MORPH_STAGES[stage]
  const smooth = gnsm === 1

  return (
    <div style={{
      background: T.surface2, border: `1px solid ${T.border}`,
      borderRadius: 3, padding: "12px 14px", marginBottom: 4,
    }}>
      <div style={{ position: "relative", height: 58 }}>
        {info.grains.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", fontFamily: MF, fontSize: 12, color: T.muted, letterSpacing: "0.08em",
          }}>
            — SILENT GAP BETWEEN GENES —
          </div>
        ) : info.grains.map((g, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${g.l}%`, top: 5 + i * 12,
            width: `${g.w}%`, height: 14,
            background: info.col,
            opacity: 0.22 + i * 0.09,
            borderRadius: smooth ? 7 : 2,
            boxShadow: smooth ? `0 0 14px ${info.col}88` : `0 0 4px ${info.col}55`,
            transition: "all 0.25s ease",
          }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "inherit",
              background: `linear-gradient(90deg,transparent,${info.col}44,transparent)`,
            }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span style={{ fontFamily: MF, fontSize: 11, color: info.col, letterSpacing: "0.06em" }}>
          {info.label.toUpperCase()}
        </span>
        <span style={{ fontFamily: MF, fontSize: 10, color: T.muted }}>
          {smooth ? "liquid smooth · " : ""}{info.grains.length} active {info.grains.length === 1 ? "gene" : "genes"}
        </span>
      </div>
    </div>
  )
}
