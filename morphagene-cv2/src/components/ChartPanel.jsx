import { useMemo } from "react"
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  ResponsiveContainer, Cell,
} from "recharts"
import { StatBlock, ChartTitle, Note, Mono, Pill, makeTooltip } from "./atoms.jsx"
import { GrainOverlapViz } from "./GrainOverlapViz.jsx"
import {
  clamp, snap1, getVSMetrics, getMorphStage,
  vsPoints, gsPoints, slPoints, moPoints, orPoints, sosPoints,
} from "../utils/math.js"

const MF = "'DM Mono','Fira Code',monospace"

// ── ChartPanel ───────────────────────────────────────────────────────────────
// Right-hand panel: all charts, stat blocks, and notes for the active input.

export function ChartPanel({ inp, currentCV, timeDomain, animTime, isPlaying, firmOpts, T, col, spliceCount, modSrc, windowSize = 5 }) {  const cv   = currentCV
  const sCV  = snap1(clamp(cv, inp.min, inp.max))
  const TT   = useMemo(() => makeTooltip(T), [T])
  const dotR = isPlaying ? 7 : 5

  const morphStage = getMorphStage(cv)

  // ── Static curve data ──────────────────────────────────────────────────────
  const staticData = useMemo(() => {
    if (inp.id === "varispeed") return vsPoints(firmOpts.vsop || 0)
    if (inp.id === "genesize")  return gsPoints()
    if (inp.id === "slide")     return slPoints()
    if (inp.id === "morph")     return moPoints()
    if (inp.id === "organize")  return orPoints(spliceCount)
    if (inp.id === "sos")       return sosPoints()
    return []
  }, [inp.id, firmOpts.vsop, spliceCount])

  // ── ReferenceDot Y values ──────────────────────────────────────────────────
  const dotY = useMemo(() => {
    const s = sCV
    if (inp.id === "varispeed") { const m = getVSMetrics(s, firmOpts.vsop || 0); return { speed: m.speed, st: m.semitones } }
    if (inp.id === "genesize")  return { grainPct: (1 - clamp(s, 0, 8) / 8) * 100 }
    if (inp.id === "slide")     return { pos: clamp(s, 0, 8) / 8 * 100 }
    if (inp.id === "morph")     return { density: s < 0.8 ? 0.2 : s < 1.5 ? 1 : s < 2.8 ? 2 : s < 4 ? 3 : 4 }
    if (inp.id === "sos")       return { live: 1 - clamp(s, 0, 8) / 8, buf: clamp(s, 0, 8) / 8 }
    return {}
  }, [cv, inp.id, firmOpts.vsop, sCV])

  // ── Stat block items ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (inp.id === "varispeed") {
      const { speed, semitones } = getVSMetrics(cv, firmOpts.vsop || 0)
      return [
        { label: "CV Voltage",  value: `${cv >= 0 ? "+" : ""}${cv.toFixed(2)} V` },
        { label: "Pitch Shift", value: `${semitones >= 0 ? "+" : ""}${semitones} st` },
        { label: "Speed ×",     value: `${speed.toFixed(4)}×` },
        { label: "Direction",   value: cv < 0 ? "REVERSE" : cv === 0 ? "STOPPED" : "FORWARD",
          hi: cv < 0 ? "#ff3f7f" : cv === 0 ? "#ff9800" : "#55dd33" },
      ]
    }
    if (inp.id === "genesize") {
      const pct = (1 - clamp(cv, 0, 8) / 8) * 100
      return [
        { label: "CV Voltage",  value: `${cv.toFixed(2)} V` },
        { label: "Gene Window", value: `${pct.toFixed(1)}%` },
        { label: "Mode",        value: pct > 90 ? "FULL LOOP" : pct > 30 ? "SEGMENT" : "GRANULAR",
          hi: pct > 90 ? "#55dd33" : pct > 30 ? "#ff9800" : "#dd44ff" },
      ]
    }
    if (inp.id === "slide") {
      const pos = clamp(cv, 0, 8) / 8 * 100
      return [
        { label: "CV Voltage", value: `${cv.toFixed(2)} V` },
        { label: "Position",   value: `${pos.toFixed(1)}%` },
        { label: "Zone",       value: pos < 10 ? "START" : pos > 90 ? "END" : "MID-SPLICE" },
      ]
    }
    if (inp.id === "morph") {
      const labels  = ["Gap", "Seamless", "2× Overlap", "3× Pan", "4×+Pitch"]
      const hiCols  = ["#546e7a", "#26c6da", "#66bb6a", "#ffa726", "#dd44ff"]
      return [
        { label: "CV Voltage",    value: `${cv.toFixed(2)} V` },
        { label: "Stage",         value: labels[morphStage], hi: hiCols[morphStage] },
        { label: "Active Grains", value: `${morphStage === 0 ? "0 (gap)" : morphStage}` },
        { label: "Pitch Scatter", value: morphStage >= 4 ? "ON" : "OFF", hi: morphStage >= 4 ? "#dd44ff" : T.muted },
      ]
    }
    if (inp.id === "organize") {
      const sel = Math.min(spliceCount - 1, Math.floor((clamp(cv, 0, 5) / 5) * spliceCount))
      return [
        { label: "CV Voltage",   value: `${cv.toFixed(2)} V` },
        { label: "Selected",     value: `Splice #${sel + 1} / ${spliceCount}` },
        { label: "V per Splice", value: `${(5 / spliceCount).toFixed(3)} V`, hi: col },
        { label: "Timing",       value: firmOpts.omod === 1 ? "IMMEDIATE" : "WAIT FOR GENE",
          hi: firmOpts.omod === 1 ? "#ff9800" : T.muted },
      ]
    }
    if (inp.id === "sos") {
      const buf = clamp(cv, 0, 8) / 8
      return [
        { label: "CV Voltage",     value: `${cv.toFixed(2)} V` },
        { label: "Live Input",     value: `${((1 - buf) * 100).toFixed(0)}%`, hi: buf < 0.5 ? "#55dd33" : T.muted },
        { label: "Buffer Feedbk.", value: `${(buf * 100).toFixed(0)}%`,       hi: buf > 0.5 ? "#ff3f7f" : T.muted },
        { label: "Mode",           value: buf > 0.95 ? "FROZEN LOOP" : buf < 0.05 ? "LIVE ONLY" : "OVERDUB" },
      ]
    }
    return []
  }, [inp.id, cv, firmOpts, morphStage, spliceCount, col, T])

  const tdPlayhead = isPlaying ? (animTime % 5) : null

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingBottom: 32 }}>

      {/* Meta pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {inp.meta.map((m, i) => <Pill key={i} color={col}>{m}</Pill>)}
      </div>

      <StatBlock items={stats} T={T} />

      {/* ── Time domain modulation preview ── */}
      {timeDomain.length > 0 && (<>
        <ChartTitle T={T} mt={0}>CV Over Time — Modulation Preview</ChartTitle>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={timeDomain} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="t" stroke={T.border2}
              tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
              label={{ value: "t (s)", fill: T.muted, fontSize: 10, position: "insideBottomRight", offset: -4 }}
              domain={isPlaying && timeDomain.length > 0
                ? [timeDomain[0].t, timeDomain[0].t + windowSize]
                : [0, windowSize]}
              type="number"
            />
            <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[inp.min, inp.max]} />
            {isPlaying && timeDomain.length > 0 && (
        <ReferenceLine x={timeDomain[0].t} stroke={col} strokeWidth={2} opacity={0.85} />
      )}
      {!isPlaying && tdPlayhead !== null && modSrc?.type !== "sh" && (
        <ReferenceLine x={+tdPlayhead.toFixed(3)} stroke={col} strokeWidth={2} opacity={0.85} />
      )}
            <defs>
              <linearGradient id={`td-${inp.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity={0.35} />
                <stop offset="100%" stopColor={col} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={TT} />
            <Area
              type={modSrc?.type === "sh" ? "stepAfter" : "monotone"}
              dataKey="cv" name="CV" stroke={col}
              fill={`url(#td-${inp.id})`} dot={false} strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </>)}

      {/* ── VARI-SPEED ── */}
      {inp.id === "varispeed" && (<>
        <ChartTitle T={T}>Playback Speed × CV {firmOpts.vsop > 0 ? `· ${["", "1V/Oct Bidir", "1V/Oct Fwd"][firmOpts.vsop]}` : ""}</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
            <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
            <ReferenceLine x={0} stroke={T.border2} strokeDasharray="4 2" />
            <ReferenceLine y={1} stroke={T.border2} strokeDasharray="4 2"
              label={{ value: "1:1", fill: T.muted, fontSize: 10, position: "insideTopRight" }} />
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot x={sCV} y={dotY.speed} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
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
            <ReferenceDot x={sCV} y={dotY.st} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
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
      </>)}

      {/* ── GENE SIZE ── */}
      {inp.id === "genesize" && (<>
        <ChartTitle T={T}>Gene Window % × CV</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
            <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 100]} unit="%" />
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot x={sCV} y={dotY.grainPct} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
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
          <div style={{ position: "relative", height: 30, background: T.dim, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(1 - clamp(cv, 0, 8) / 8) * 100}%`, background: col, opacity: 0.22, transition: "width 0.04s linear" }} />
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: `${(1 - clamp(cv, 0, 8) / 8) * 100}%`, height: 2, background: col, boxShadow: `0 0 8px ${col}`, transition: "width 0.04s linear" }} />
            <div style={{ position: "absolute", top: 6, left: 8, fontFamily: MF, fontSize: 9, color: T.muted }}>SPLICE WINDOW ▶ GENE WINDOW</div>
          </div>
        </div>
        <Note T={T}>Unipolar 0–8V (negative CV clamped). Gene Size is time-based, not sample-count-based — grain duration stays consistent regardless of Vari-Speed. Toggle <Mono T={T}>gnsm 1</Mono> in Firmware tab — the grain overlap visualiser on the MORPH panel reflects the grain edge style.</Note>
      </>)}

      {/* ── SLIDE ── */}
      {inp.id === "slide" && (<>
        <ChartTitle T={T}>Splice Position % × CV</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
            <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 100]} unit="%" />
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot x={sCV} y={dotY.pos} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
              style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
            <Tooltip content={TT} />
            <Line type="monotone" dataKey="pos" name="position%" stroke={col} dot={false} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
        <ChartTitle T={T}>Tape Scrub Position (live)</ChartTitle>
        <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 3, padding: "12px 16px", marginBottom: 4 }}>
          <div style={{ position: "relative", height: 38 }}>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} style={{ position: "absolute", left: `${i * 5}%`, top: 8, bottom: 8, width: "4.5%", background: i < Math.floor(clamp(cv, 0, 8) / 8 * 20) ? T.surface : T.dim, borderRight: `1px solid ${T.border}` }} />
            ))}
            <div style={{ position: "absolute", left: `${clamp(cv, 0, 8) / 8 * 100}%`, top: 0, bottom: 0, width: 2.5, background: col, boxShadow: `0 0 10px ${col}`, transform: "translateX(-50%)", transition: "left 0.04s linear" }} />
            <div style={{ position: "absolute", top: 5, left: 7, fontFamily: MF, fontSize: 9, color: T.muted }}>◀ SPLICE START ——  SLIDE ——  SPLICE END ▶</div>
          </div>
        </div>
        <Note T={T}>Position changes are immediate — not quantised to gene boundaries. Use smooth CV sources (MATHS, slow LFO) to avoid clicks. A 0→8V ramp creates full chronological scrubbing without pitch change. Self-patch CV Out → Slide for content-reactive positioning.</Note>
      </>)}

      {/* ── MORPH ── */}
      {inp.id === "morph" && (<>
        <ChartTitle T={T}>Grain Density × CV {firmOpts.ckop > 0 ? `· ${["", "Gene Shift locked", "Time Stretch locked"][firmOpts.ckop]}` : ""}</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
            <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 4.5]} ticks={[0, 1, 2, 3, 4]} />
            {[0.8, 1.5, 2.8, 4.0].map((x, i) => (
              <ReferenceLine key={x} x={x} stroke={T.border2} strokeDasharray="2 4"
                label={{ value: ["seam", "2×", "3×", "4×"][i], fill: T.muted, fontSize: 9, position: "top" }} />
            ))}
            <ReferenceLine x={sCV} stroke={col} strokeWidth={2} opacity={0.75} />
            <ReferenceDot x={sCV} y={dotY.density} r={dotR} fill={col} stroke={T.surface} strokeWidth={2.5}
              style={{ filter: `drop-shadow(0 0 5px ${col})` }} />
            <defs>
              <linearGradient id="mo-g" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#546e7a" stopOpacity={0.4} />
                <stop offset="30%"  stopColor="#66bb6a" stopOpacity={0.4} />
                <stop offset="80%"  stopColor="#dd44ff" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <Tooltip content={TT} />
            <Area type="stepAfter" dataKey="density" name="grains" stroke={col} fill="url(#mo-g)" dot={false} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
        <ChartTitle T={T}>Simultaneous Gene Layers (live)</ChartTitle>
        <GrainOverlapViz stage={morphStage} gnsm={firmOpts.gnsm || 0} T={T} />
        <Note T={T}>Unity-gain 0–5V. No attenuverter — use external scaling for subtle modulation. With CLK patched: below ~10:00 = Gene Shift; above ~10:00 = Time Stretch. Morph pitch ratios configurable via <Mono T={T}>mcr1/2/3</Mono> (range 0.0625–16.0×, including negative for reverse).</Note>
      </>)}

      {/* ── ORGANIZE ── */}
      {inp.id === "organize" && (() => {
        const selIdx = Math.min(spliceCount - 1, Math.floor((clamp(cv, 0, 5) / 5) * spliceCount))
        return (<>
          <ChartTitle T={T}>Splice Selection × CV ({spliceCount} splices)</ChartTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="splice" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
                label={{ value: "splice #", fill: T.muted, fontSize: 10, position: "insideBottomRight", offset: -4 }} />
              <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
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
          <Note T={T}>Unity-gain 0–5V. Community reports up to 8V sometimes needed for final splices in large banks. Selection is quantised — no gradual crossfade. Toggle <Mono T={T}>omod 1</Mono> for immediate switching. Allow 2–4ms gate delay when combining CV + trigger to avoid timing races.</Note>
        </>)
      })()}

      {/* ── SOS ── */}
      {inp.id === "sos" && (<>
        <ChartTitle T={T}>Live / Buffer Mix × CV</ChartTitle>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={staticData} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="v" stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} />
            <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
            <ReferenceLine x={sCV} stroke={T.border2} strokeWidth={1.5} opacity={0.8} />
            <ReferenceDot x={sCV} y={dotY.live} r={dotR} fill="#55dd33" stroke={T.surface} strokeWidth={2.5} style={{ filter: "drop-shadow(0 0 5px #55dd33)" }} />
            <ReferenceDot x={sCV} y={dotY.buf}  r={dotR} fill="#ff3f7f" stroke={T.surface} strokeWidth={2.5} style={{ filter: "drop-shadow(0 0 5px #ff3f7f)" }} />
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
          {(() => {
            const buf = clamp(cv, 0, 8) / 8, live = 1 - buf
            return (<>
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
                <span style={{ fontFamily: MF, fontSize: 12, color: "#ff3f7f" }}>{(buf * 100).toFixed(0)}%</span>
              </div>
            </>)
          })()}
        </div>
        <Note T={T}>Normalised to +8V (no patch = full buffer feedback). Knob acts as attenuator when CV is patched. Use envelope → SOS for percussive loop captures. Enable <Mono T={T}>inop 1</Mono> to record raw input regardless of SOS level.</Note>
      </>)}

    </div>
  )
}
