import { MF, CLK_BLUE } from "../theme.js"

// ── Mode 1 stage definitions (no CLK) ────────────────────────────────────────
const MORPH_STAGES = [
  { label: "Gapped Loop",           col: "#ff3f7f", grains: [] },
  { label: "Seamless Loop",         col: "#ffe033", grains: [{ l: 0,  w: 68 }] },
  { label: "2× Overlap",            col: "#ff3f7f", grains: [{ l: 0,  w: 62 }, { l: 32, w: 62 }] },
  { label: "3× Overlap + Panning",  col: "#ff3f7f", grains: [{ l: 0,  w: 56 }, { l: 22, w: 56 }, { l: 44, w: 56 }] },
  { label: "4× + Pitch Scatter",    col: "#ffe033", grains: [{ l: 0,  w: 50 }, { l: 13, w: 50 }, { l: 26, w: 50 }, { l: 39, w: 50 }] },
]

// ── Mode 2 stage definitions (CLK patched) — colors driven by ckop ────────────
function getClkStages(ckop) {
  const lo = ckop === 2 ? CLK_BLUE : "#ff3f7f"   // Zones 1–2 (Gene Shift unless forced TS)
  const hi = ckop === 1 ? "#ff3f7f" : CLK_BLUE   // Zones 3–4 (Time Stretch unless forced GS)
  const z5 = ckop === 1 ? "#ff3f7f" : "#00e5ff"  // Zone 5
  return [
    { label: "Gene Shift",          col: lo, grains: [{ l: 0,  w: 68 }] },
    { label: "1 / 1",               col: lo, grains: [{ l: 0,  w: 68 }] },
    { label: "2 Genes",             col: hi, grains: [{ l: 0,  w: 62 }, { l: 32, w: 62 }] },
    { label: "3 Genes",             col: hi, grains: [{ l: 0,  w: 56 }, { l: 22, w: 56 }, { l: 44, w: 56 }] },
    { label: "4× + Pitch / Pan",    col: z5, grains: [{ l: 0,  w: 50 }, { l: 13, w: 50 }, { l: 26, w: 50 }, { l: 39, w: 50 }] },
  ]
}

// ── GrainOverlapViz ───────────────────────────────────────────────────────────
export function GrainOverlapViz({ stage, gnsm, T, clkMode = false, ckop = 0 }) {
  const stages = clkMode ? getClkStages(ckop) : MORPH_STAGES
  const info   = stages[stage]
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
            — GAP BETWEEN GENE REPEATS —
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
