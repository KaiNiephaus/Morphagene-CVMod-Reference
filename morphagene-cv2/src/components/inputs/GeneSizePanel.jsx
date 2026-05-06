import { useMemo } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts"
import { StatBlock, ChartTitle, Note, Mono } from "../atoms.jsx"
import { gsPoints, clamp } from "../../utils/math.js"
import { MF } from "../../theme.js"

export function GeneSizePanel({ cv, sCV, dotR, TT, T, col }) {
  const staticData = useMemo(() => gsPoints(), [])
  const pct = (1 - clamp(cv, 0, 8) / 8) * 100

  const stats = [
    { label: "CV Voltage",  value: `${cv.toFixed(2)} V` },
    { label: "Gene Window", value: `${pct.toFixed(1)}%` },
    { label: "Mode",        value: pct > 90 ? "FULL LOOP" : pct > 30 ? "SEGMENT" : "GRANULAR",
      hi: pct > 90 ? "#55dd33" : pct > 30 ? "#ff9800" : "#dd44ff" },
  ]

  return (<>
    <StatBlock items={stats} T={T} />
    <ChartTitle T={T} mt={0}>Gene Window % × CV</ChartTitle>
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 100]} unit="%" />
        <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
        <ReferenceDot x={sCV} y={pct} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
        <defs>
          <linearGradient id="gs-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={col} stopOpacity={0.5} />
            <stop offset="100%" stopColor={col} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <Tooltip content={TT} />
        <Area type="monotone" dataKey="grainPct" name="grain%" stroke={col} fill="url(#gs-g)" dot={false} strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
    <ChartTitle T={T}>Grain Envelope Size (relative, live)</ChartTitle>
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 3, padding: "12px 16px", marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: MF, fontSize: 9, color: T.muted }}>SPLICE WINDOW ▶ GENE WINDOW</span>
        <span style={{ fontFamily: MF, fontSize: 11, color: col, fontWeight: 500 }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ position: "relative", height: 30, background: T.dim, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: col, opacity: 0.22 }} />
        <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: `${pct}%`, height: 2, background: col, boxShadow: `0 0 8px ${col}` }} />
      </div>
    </div>
    <Note T={T}>Unipolar 0–8V (negative CV clamped). Gene Size is time-based, not sample-count-based — grain duration stays consistent regardless of Vari-Speed. Toggle <Mono T={T}>gnsm 1</Mono> in Firmware tab — the grain overlap visualiser on the MORPH panel reflects the grain edge style.</Note>
  </>)
}
