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
const STAGE_COLORS = ["#ff3f7f", "#ffe033", "#ff3f7f", "#ff3f7f", "#ffe033"]

export function MorphPanel({ cv, sCV, dotR, TT, T, col, firmOpts }) {
  const staticData = useMemo(() => moPoints(), [])
  const stage = getMorphStage(cv)
  const dotDensity = cv < 0.625 ? 0.75 : cv < 1.25 ? 1 : cv < 2.5 ? 2 : cv < 3.75 ? 3 : 4

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
      <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} ticks={[0, 0.625, 1.25, 2.5, 3.75, 5]} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 4.5]} ticks={[0, 1, 2, 3, 4]} />
        {/* Zone boundaries — amber at each transition, matching gradient spikes */}
        {[0.625, 1.25, 2.5, 3.75].map((x, i) => (
          <ReferenceLine key={x} x={x} stroke="#ffe033" strokeDasharray="2 4" opacity={0.55}
            label={{ value: ["1/1", "2×", "3×", "4×"][i], fill: "#ffe033", fontSize: 9, position: "top" }} />
        ))}
        <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
        <ReferenceDot x={sCV} y={dotDensity} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
        <defs>
          {/* Hardware LED colors. 5 zones: Z1=0–12.5%, Z2=12.5–25%, Z3=25–50%, Z4=50–75%, Z5=75–100%
              Amber spike at each zone boundary (tight 2% band). Zone 5 stays solid amber. */}
          <linearGradient id="mo-g" x1="0" y1="0" x2="1" y2="0">
            {/* Zones 1–4: pink/red fill. Yellow spikes at boundaries. Zone 5: solid yellow. */}
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
