import { useMemo } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts"
import { StatBlock, ChartTitle, Note, Mono } from "../atoms.jsx"
import { sosPoints, clamp } from "../../utils/math.js"
import { MF } from "../../theme.js"

export function SosPanel({ cv, sCV, dotR, T, col, firmOpts }) {
  const staticData = useMemo(() => sosPoints(), [])
  const buf  = clamp(cv, 0, 8) / 8
  const live = 1 - buf

  const stats = [
    { label: "CV Voltage",     value: `${cv.toFixed(2)} V` },
    { label: "Live Input",     value: `${(live * 100).toFixed(0)}%`, hi: buf < 0.5 ? "#55dd33" : T.muted },
    { label: "Buffer Feedbk.", value: `${(buf  * 100).toFixed(0)}%`, hi: buf > 0.5 ? "#ff3f7f" : T.muted },
    { label: "Mode",           value: buf > 0.95 ? "FROZEN LOOP" : buf < 0.05 ? "LIVE ONLY" : "OVERDUB" },
  ]

  return (<>
    <StatBlock items={stats} T={T} />
    <ChartTitle T={T} mt={0}>Live / Buffer Mix × CV</ChartTitle>
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 1]}
          tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
        <ReferenceLine x={sCV} stroke={T.border2} strokeWidth={1.5} opacity={0.8} />
        <ReferenceDot x={sCV} y={live} r={dotR} fill="#55dd33" stroke={T.surface} strokeWidth={2.5}
          style={{ filter: "drop-shadow(0 0 5px #55dd33)" }} />
        <ReferenceDot x={sCV} y={buf}  r={dotR} fill="#ff3f7f" stroke={T.surface} strokeWidth={2.5}
          style={{ filter: "drop-shadow(0 0 5px #ff3f7f)" }} />
        <defs>
          <linearGradient id="sos-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#55dd33" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#55dd33" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="sos-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3f7f" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ff3f7f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
          <div style={{ background: T.tooltip, border: `1px solid ${T.border2}`, padding: "8px 12px", fontFamily: MF, fontSize: 11, color: T.text }}>
            <div style={{ color: T.muted, marginBottom: 4 }}>CV {label}V</div>
            {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {(p.value * 100).toFixed(1)}%</div>)}
          </div>
        ) : null} />
        <Area type="monotone" dataKey="live" name="Live Input" stroke="#55dd33" fill="url(#sos-l)" dot={false} strokeWidth={2.5} />
        <Area type="monotone" dataKey="buf"  name="Buffer"     stroke="#ff3f7f" fill="url(#sos-b)" dot={false} strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
    <ChartTitle T={T}>Signal Balance Meter (live)</ChartTitle>
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 3, padding: "12px 16px", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: MF, fontSize: 11, color: "#55dd33", minWidth: 30 }}>LIVE</span>
        <div style={{ flex: 1, height: 22, background: T.dim, borderRadius: 2, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${live * 100}%`, background: "linear-gradient(90deg,#55dd33bb,#55dd3333)", transition: "width 0.04s linear" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${buf * 100}%`, background: "linear-gradient(90deg,#ff3f7f33,#ff3f7fbb)", transition: "width 0.04s linear" }} />
          <div style={{ position: "absolute", left: `${live * 100}%`, top: 0, bottom: 0, width: 2, background: T.border2, transform: "translateX(-50%)" }} />
        </div>
        <span style={{ fontFamily: MF, fontSize: 11, color: "#ff3f7f", minWidth: 36, textAlign: "right" }}>BUF</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
        <span style={{ fontFamily: MF, fontSize: 12, color: "#55dd33" }}>{(live * 100).toFixed(0)}%</span>
        <span style={{ fontFamily: MF, fontSize: 12, color: "#ff3f7f" }}>{(buf  * 100).toFixed(0)}%</span>
      </div>
    </div>
    <Note T={T}>Normalised to +8V (no patch = full buffer feedback). Knob acts as attenuator when CV is patched. Use envelope → SOS for percussive loop captures. Enable <Mono T={T}>inop 1</Mono> to record raw input regardless of SOS level.</Note>
  </>)
}
