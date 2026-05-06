import { useMemo, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts"
import { StatBlock, ChartTitle, Note, Mono } from "../atoms.jsx"
import { GrainOverlapViz } from "../GrainOverlapViz.jsx"
import { moPoints, getMorphStage } from "../../utils/math.js"
import { MF, CLK_BLUE } from "../../theme.js"

// ── Mode 1 (no CLK) ──────────────────────────────────────────────────────────
const STAGE_LABELS = ["Gapped Loop", "Seamless", "2× Overlap", "3× Pan", "4×+Pitch"]
const STAGE_COLORS = ["#ff3f7f", "#ffe033", "#ff3f7f", "#ff3f7f", "#ffe033"]

// ── Mode 2 (CLK patched) — stage colors respond to ckop ─────────────────────
const STAGE_LABELS_2 = ["Gene Shift", "1/1", "2 Genes", "3 Genes", "4× + Pitch/Pan"]
function clkStageColors(ckop) {
  if (ckop === 1) return ["#ff3f7f", "#ff3f7f", "#ff3f7f", "#ff3f7f", "#ff3f7f"]
  if (ckop === 2) return [CLK_BLUE,  CLK_BLUE,  CLK_BLUE,  CLK_BLUE,  "#00e5ff"]
  return                  ["#ff3f7f", "#ff3f7f", CLK_BLUE,  CLK_BLUE,  "#00e5ff"]
}

export function MorphPanel({ cv, sCV, dotR, TT, T, col, firmOpts }) {
  const [clkIn, setClkIn] = useState(false)
  const staticData = useMemo(() => moPoints(), [])
  const stage      = getMorphStage(cv)
  const dotDensity = cv < 0.625 ? 0.75 : cv < 1.25 ? 1 : cv < 2.5 ? 2 : cv < 3.75 ? 3 : 4

  // Mode 2 stat values
  const stageColors2   = clkStageColors(firmOpts.ckop)
  const isTimeStretch  = firmOpts.ckop === 2 || (firmOpts.ckop !== 1 && cv >= 1.25)
  const clkBehavior    = firmOpts.ckop === 1 ? "Gene Shift (forced)"
    : firmOpts.ckop === 2 ? "Time Stretch (forced)"
    : isTimeStretch ? "Time Stretch" : "Gene Shift"
  const clkColor       = isTimeStretch ? "#00e5ff" : "#ff3f7f"

  const stats1 = [
    { label: "CV Voltage",    value: `${cv.toFixed(2)} V` },
    { label: "Stage",         value: STAGE_LABELS[stage],  hi: STAGE_COLORS[stage] },
    { label: "Active Grains", value: stage === 0 ? "1 (gapped)" : String(stage) },
    { label: "Pitch Scatter", value: stage >= 4 ? "ON" : "OFF", hi: stage >= 4 ? "#ffe033" : T.muted },
  ]

  const stats2 = [
    { label: "CV Voltage",   value: `${cv.toFixed(2)} V` },
    { label: "Stage",        value: STAGE_LABELS_2[stage], hi: stageColors2[stage] },
    { label: "CLK Behavior", value: clkBehavior,           hi: clkColor },
    { label: "Pitch/Pan",    value: stage >= 4 ? "ON" : "OFF", hi: stage >= 4 ? "#00e5ff" : T.muted },
  ]

  // Mode 2 gradient fill colors (driven by ckop)
  const lo  = firmOpts.ckop === 2 ? CLK_BLUE : "#ff3f7f"   // Zones 1–2
  const hi  = firmOpts.ckop === 1 ? "#ff3f7f" : CLK_BLUE   // Zones 3–4
  const z5  = firmOpts.ckop === 1 ? "#ff3f7f" : "#00e5ff"  // Zone 5
  const t25 = firmOpts.ckop === 1 ? "#ffe033" : "#00e5ff"  // 2.5V boundary (CYAN except when forced gene shift)

  return (<>
    <StatBlock items={clkIn ? stats2 : stats1} T={T} />

    <ChartTitle T={T} mt={0}>
      Grain Density × CV{firmOpts.ckop > 0 ? ` · ${["", "Gene Shift locked", "Time Stretch locked"][firmOpts.ckop]}` : ""}
    </ChartTitle>

    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" type="number" domain={[0, 5]} stroke={T.border2}
          tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} ticks={[0, 0.625, 1.25, 2.5, 3.75, 5]} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
          domain={[0, 4.5]} ticks={[0, 1, 2, 3, 4]} />

        {/* Zone boundaries — 2.5V is CYAN in CLK mode (unless ckop forces gene shift) */}
        {[0.625, 1.25, 2.5, 3.75].map((x, i) => {
          const isCyan = clkIn && x === 2.5 && firmOpts.ckop !== 1
          const c = isCyan ? "#00e5ff" : "#ffe033"
          return (
            <ReferenceLine key={x} x={x} stroke={c} strokeDasharray="2 4" opacity={0.55}
              label={{ value: ["1/1", "2×", "3×", "4×"][i], fill: c, fontSize: 9, position: "top" }} />
          )
        })}

        <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
        <ReferenceDot x={sCV} y={dotDensity} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />

        <defs>
          {/* Mode 1 — no CLK */}
          <linearGradient id="mo-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"    stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="12%"   stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="12.5%" stopColor="#ffe033" stopOpacity={0.95} />
            <stop offset="13%"   stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="24.5%" stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="25%"   stopColor="#ffe033" stopOpacity={0.95} />
            <stop offset="25.5%" stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="49.5%" stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="50%"   stopColor="#ffe033" stopOpacity={0.95} />
            <stop offset="50.5%" stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="74.5%" stopColor="#ff3f7f" stopOpacity={0.55} />
            <stop offset="75%"   stopColor="#ffe033" stopOpacity={0.95} />
            <stop offset="75.5%" stopColor="#ffe033" stopOpacity={0.65} />
            <stop offset="100%"  stopColor="#ffe033" stopOpacity={0.65} />
          </linearGradient>

          {/* Mode 2 — CLK patched. Colors react to ckop. */}
          <linearGradient id="mo-g2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"    stopColor={lo}    stopOpacity={0.55} />
            <stop offset="12%"   stopColor={lo}    stopOpacity={0.55} />
            <stop offset="12.5%" stopColor="#ffe033" stopOpacity={0.95} />
            <stop offset="13%"   stopColor={lo}    stopOpacity={0.55} />
            <stop offset="24.5%" stopColor={lo}    stopOpacity={0.55} />
            <stop offset="25%"   stopColor="#ffe033" stopOpacity={0.95} />
            <stop offset="25.5%" stopColor={hi}    stopOpacity={0.65} />
            <stop offset="49.5%" stopColor={hi}    stopOpacity={0.65} />
            <stop offset="50%"   stopColor={t25}   stopOpacity={0.95} />
            <stop offset="50.5%" stopColor={hi}    stopOpacity={0.65} />
            <stop offset="74.5%" stopColor={hi}    stopOpacity={0.65} />
            <stop offset="75%"   stopColor="#ffe033" stopOpacity={0.95} />
            <stop offset="75.5%" stopColor={z5}    stopOpacity={0.65} />
            <stop offset="100%"  stopColor={z5}    stopOpacity={0.65} />
          </linearGradient>
        </defs>

        <Tooltip content={TT} />
        <Area type="stepAfter" dataKey="density" name="grains" stroke={col}
          fill={`url(#${clkIn ? "mo-g2" : "mo-g"})`} dot={false} strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>

    {/* CLK IN toggle — below chart, above grain layer section */}
    <div style={{ padding: "10px 0 6px" }}>
      <button
        onClick={() => setClkIn(c => !c)}
        style={{
          fontFamily: MF, fontSize: 11, letterSpacing: "0.08em",
          padding: "6px 14px", borderRadius: 4, cursor: "pointer",
          border: `1px solid ${clkIn ? "#00e5ff" : T.border}`,
          background: clkIn ? "#00e5ff1a" : T.surface2,
          color: clkIn ? "#00e5ff" : T.text,
          transition: "color 0.15s, border-color 0.15s, background 0.15s",
        }}
      >
        {clkIn ? "● CLK IN: PATCHED" : "○ CLK IN: OFF"}
      </button>
    </div>

    <ChartTitle T={T}>Simultaneous Gene Layers (live)</ChartTitle>
    <GrainOverlapViz stage={stage} gnsm={firmOpts.gnsm || 0} T={T} clkMode={clkIn} ckop={firmOpts.ckop} />

    {clkIn ? (
      <Note T={T}>CLK IN patched — Gene Shift active below 1.25V (Zones 1–2), Time Stretch above (Zones 3–5). <Mono T={T}>ckop 1</Mono> forces Gene Shift across all zones; <Mono T={T}>ckop 2</Mono> forces Time Stretch. Increasing CLK rate = time shift; decreasing = time stretch.</Note>
    ) : (
      <Note T={T}>Unity-gain 0–5V. No attenuverter — use external scaling for subtle modulation. With CLK patched: below ~1.25V = Gene Shift; above ~1.25V = Time Stretch. Morph pitch ratios configurable via <Mono T={T}>mcr1/2/3</Mono> (range 0.0625–16.0×, including negative for reverse).</Note>
    )}
  </>)
}
