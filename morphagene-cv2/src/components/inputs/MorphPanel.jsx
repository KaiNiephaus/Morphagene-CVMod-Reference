import { useMemo } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts"
import { StatBlock, ChartTitle, Note, Mono } from "../atoms.jsx"
import { GrainOverlapViz } from "../GrainOverlapViz.jsx"
import { moPoints, getMorphStage } from "../../utils/math.js"
import { MF } from "../../theme.js"

const STAGE_LABELS = ["Gapped Loop", "Seamless", "2× Overlap", "3× Pan", "4×+Pitch"]
// Hardware LED colors: Red for gaps+overlaps, Amber for seamless threshold and pitch-up zone
const STAGE_COLORS = ["#e53935", "#f9a825", "#e53935", "#e53935", "#f9a825"]

export function MorphPanel({ cv, sCV, dotR, TT, T, col, firmOpts }) {
  const staticData = useMemo(() => moPoints(), [])
  const stage = getMorphStage(cv)
  const dotDensity = cv < 1.25 ? 0.75 : cv < 2.5 ? 1 : cv < 3.33 ? 2 : cv < 4.17 ? 3 : 4

  const stats = [
    { label: "CV Voltage",    value: `${cv.toFixed(2)} V` },
    { label: "Stage",         value: STAGE_LABELS[stage], hi: STAGE_COLORS[stage] },
    { label: "Active Grains", value: stage === 0 ? "1 (gapped)" : String(stage) },
    { label: "Pitch Scatter", value: stage >= 4 ? "ON" : "OFF", hi: stage >= 4 ? "#dd44ff" : T.muted },
  ]

  return (<>
    <StatBlock items={stats} T={T} />
    <ChartTitle T={T} mt={0}>
      Grain Density × CV {firmOpts.ckop > 0 ? `· ${["", "Gene Shift locked", "Time Stretch locked"][firmOpts.ckop]}` : ""}
    </ChartTitle>
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 4.5]} ticks={[0, 1, 2, 3, 4]} />
        {/* Amber LED marker at 0.8V (manual: gap reaches zero here) */}
        <ReferenceLine x={0.8} stroke="#f9a825" strokeDasharray="2 4" opacity={0.6}
          label={{ value: "seam", fill: "#f9a825", fontSize: 9, position: "top" }} />
        {/* Zone boundaries from proportional pie-chart distribution */}
        {[1.25, 2.5, 3.33, 4.17].map((x, i) => (
          <ReferenceLine key={x} x={x} stroke={T.border2} strokeDasharray="2 4"
            label={{ value: ["1/1", "2×", "3×", "4×"][i], fill: T.muted, fontSize: 9, position: "top" }} />
        ))}
        <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
        <ReferenceDot x={sCV} y={dotDensity} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
        <defs>
          {/* Hardware LED colors. Zone %s based on proportional 5-zone distribution (0–5V):
              0.8V=16% amber seam marker · 1.25V=25% · 2.5V=50% · 3.33V=66.6% · 4.17V=83.4%
              Amber fades out over ~0.3V after the seam point so it's visually readable. */}
          <linearGradient id="mo-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"    stopColor="#e53935" stopOpacity={0.45} />
            <stop offset="12%"   stopColor="#e53935" stopOpacity={0.45} />
            <stop offset="16%"   stopColor="#f9a825" stopOpacity={0.75} />
            <stop offset="22%"   stopColor="#e53935" stopOpacity={0.45} />
            <stop offset="83.4%" stopColor="#e53935" stopOpacity={0.45} />
            <stop offset="83.4%" stopColor="#f9a825" stopOpacity={0.65} />
            <stop offset="100%"  stopColor="#f9a825" stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <Tooltip content={TT} />
        <Area type="stepAfter" dataKey="density" name="grains" stroke={col} fill="url(#mo-g)" dot={false} strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
    <ChartTitle T={T}>Simultaneous Gene Layers (live)</ChartTitle>
    <GrainOverlapViz stage={stage} gnsm={firmOpts.gnsm || 0} T={T} />
    <Note T={T}>Unity-gain 0–5V. No attenuverter — use external scaling for subtle modulation. With CLK patched: below ~10:00 = Gene Shift; above ~10:00 = Time Stretch. Morph pitch ratios configurable via <Mono T={T}>mcr1/2/3</Mono> (range 0.0625–16.0×, including negative for reverse).</Note>
  </>)
}
