import { useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from "recharts"
import { StatBlock, ChartTitle, Note, Mono } from "../atoms.jsx"
import { orPoints, clamp } from "../../utils/math.js"
import { MF } from "../../theme.js"

export function OrganizePanel({ cv, T, col, firmOpts, spliceCount }) {
  const staticData = useMemo(() => orPoints(spliceCount), [spliceCount])
  const selIdx = Math.min(spliceCount - 1, Math.floor((clamp(cv, 0, 5) / 5) * spliceCount))

  const stats = [
    { label: "CV Voltage",   value: `${cv.toFixed(2)} V` },
    { label: "Selected",     value: `Splice #${selIdx + 1} / ${spliceCount}` },
    { label: "V per Splice", value: `${(5 / spliceCount).toFixed(3)} V`, hi: col },
    { label: "Timing",       value: firmOpts.omod === 1 ? "IMMEDIATE" : "WAIT FOR GENE",
      hi: firmOpts.omod === 1 ? "#ff9800" : T.muted },
  ]

  return (<>
    <StatBlock items={stats} T={T} />
    <ChartTitle T={T} mt={0}>Splice Selection × CV ({spliceCount} splices)</ChartTitle>
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
        <XAxis dataKey="splice" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
          label={{ value: "splice #", fill: T.muted, fontSize: 10, position: "insideBottomRight", offset: -4 }} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
          domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]}
          label={{ value: "CV (V)", fill: T.muted, fontSize: 10, angle: -90, position: "insideLeft" }} />
        <ReferenceLine y={cv} stroke={col} strokeWidth={2.5} opacity={0.85} />
        <Tooltip content={({ active, payload }) => active && payload?.length ? (
          <div style={{ background: T.tooltip, border: `1px solid ${T.border2}`, padding: "8px 12px", fontFamily: MF, fontSize: 11, color: T.text }}>
            <div style={{ color: T.muted }}>Splice #{payload[0]?.payload?.splice}</div>
            <div style={{ color: col }}>Threshold: {payload[0]?.payload?.threshold}V</div>
          </div>
        ) : null} />
        <Bar dataKey="threshold" radius={[2, 2, 0, 0]}>
          {staticData.map((_, i) => (
            <Cell key={i} fill={i === selIdx ? col : T.surface2} stroke={i === selIdx ? col : T.border} strokeWidth={1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <div style={{ paddingBottom: 24 }}>
      <Note T={T}>Unity-gain 0–5V. Community reports up to 8V sometimes needed for final splices in large banks. Selection is quantised — no gradual crossfade. Toggle <Mono T={T}>omod 1</Mono> for immediate switching. Allow 2–4ms gate delay when combining CV + trigger to avoid timing races.</Note>
    </div>
  </>)
}
