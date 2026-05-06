import { useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts"
import { StatBlock, ChartTitle, Note } from "../atoms.jsx"
import { slPoints, clamp } from "../../utils/math.js"
import { MF } from "../../theme.js"

export function SlidePanel({ cv, sCV, dotR, TT, T, col }) {
  const staticData = useMemo(() => slPoints(), [])
  const pos = clamp(cv, 0, 8) / 8 * 100

  const stats = [
    { label: "CV Voltage", value: `${cv.toFixed(2)} V` },
    { label: "Position",   value: `${pos.toFixed(1)}%` },
    { label: "Zone",       value: pos < 10 ? "START" : pos > 90 ? "END" : "MID-SPLICE" },
  ]

  return (<>
    <StatBlock items={stats} T={T} />
    <ChartTitle T={T} mt={0}>Splice Position % × CV</ChartTitle>
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 100]} unit="%" />
        <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
        <ReferenceDot x={sCV} y={pos} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
        <Tooltip content={TT} />
        <Line type="monotone" dataKey="pos" name="position%" stroke={col} dot={false} strokeWidth={2.5} />
      </LineChart>
    </ResponsiveContainer>
    <ChartTitle T={T}>Tape Scrub Position (live)</ChartTitle>
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 3, padding: "12px 16px", marginBottom: 4 }}>
      <div style={{ position: "relative", height: 38 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            position: "absolute", left: `${i * 5}%`, top: 8, bottom: 8, width: "4.5%",
            background: i < Math.floor(clamp(cv, 0, 8) / 8 * 20) ? T.surface : T.dim,
            borderRight: `1px solid ${T.border}`,
          }} />
        ))}
        <div style={{
          position: "absolute", left: `${pos}%`, top: 0, bottom: 0,
          width: 2.5, background: col, boxShadow: `0 0 10px ${col}`,
          transform: "translateX(-50%)", transition: "left 0.04s linear",
        }} />
        <div style={{ position: "absolute", top: 5, left: 7, fontFamily: MF, fontSize: 9, color: T.muted }}>
          ◀ SPLICE START ——  SLIDE ——  SPLICE END ▶
        </div>
      </div>
    </div>
    <Note T={T}>Position changes are immediate — not quantised to gene boundaries. Use smooth CV sources (MATHS, slow LFO) to avoid clicks. A 0→8V ramp creates full chronological scrubbing without pitch change. Self-patch CV Out → Slide for content-reactive positioning.</Note>
  </>)
}
