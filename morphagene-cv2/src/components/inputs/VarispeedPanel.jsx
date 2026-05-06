import { useMemo } from "react"
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts"
import { StatBlock, ChartTitle, Note, Mono } from "../atoms.jsx"
import { vsPoints, getVSMetrics } from "../../utils/math.js"
import { MF } from "../../theme.js"

export function VarispeedPanel({ cv, sCV, dotR, TT, T, col, firmOpts }) {
  const vsop = firmOpts.vsop || 0
  const staticData = useMemo(() => vsPoints(vsop), [vsop])
  const { speed, semitones } = getVSMetrics(cv, vsop)

  const stats = [
    { label: "CV Voltage",  value: `${cv >= 0 ? "+" : ""}${cv.toFixed(2)} V` },
    { label: "Pitch Shift", value: `${semitones >= 0 ? "+" : ""}${semitones} st` },
    { label: "Speed ×",     value: `${speed.toFixed(4)}×` },
    { label: "Direction",   value: cv < 0 ? "REVERSE" : cv === 0 ? "STOPPED" : "FORWARD",
      hi: cv < 0 ? "#ff3f7f" : cv === 0 ? "#ff9800" : "#55dd33" },
  ]

  return (<>
    <StatBlock items={stats} T={T} />
    <ChartTitle T={T} mt={0}>Playback Speed × CV {vsop > 0 ? `· ${["", "1V/Oct Bidir", "1V/Oct Fwd"][vsop]}` : ""}</ChartTitle>
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <ReferenceLine x={0} stroke={T.border2} strokeDasharray="4 2" />
        <ReferenceLine y={1} stroke={T.border2} strokeDasharray="4 2"
          label={{ value: "1:1", fill: T.muted, fontSize: 10, position: "insideTopRight" }} />
        <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
        <ReferenceDot x={sCV} y={speed} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
        <Tooltip content={TT} />
        <Line type="monotone" dataKey="speed" name="speed×" stroke={col} dot={false} strokeWidth={2.5} />
      </LineChart>
    </ResponsiveContainer>
    <ChartTitle T={T}>Semitone Offset × CV</ChartTitle>
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
        <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
        <ReferenceLine x={0} stroke={T.border2} strokeDasharray="4 2" />
        <ReferenceLine y={0} stroke={T.border2} strokeDasharray="4 2" />
        <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
        <ReferenceDot x={sCV} y={semitones} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
        <defs>
          <linearGradient id="vs-st" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity={0.3} />
            <stop offset="100%" stopColor={col} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={TT} />
        <Area type="monotone" dataKey="st" name="semitones" stroke={col} fill="url(#vs-st)" dot={false} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
    <Note T={T}>Asymmetric range: +4V = +12st, −4V = −26st. Non-linear scaling adds resolution near zero for tape-flutter work. Switch firmware modes above to see the curve reshape. Enable <Mono T={T}>vsop 1</Mono> for 1V/Oct bidirectional, <Mono T={T}>vsop 2</Mono> for forward-only.</Note>
  </>)
}
