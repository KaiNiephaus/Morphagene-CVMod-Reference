import { useMemo } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { ChartTitle, Pill, makeTooltip } from "./atoms.jsx"
import { snap1, clamp, getPreviewWindow } from "../utils/math.js"
import { MF } from "../theme.js"

import { VarispeedPanel } from "./inputs/VarispeedPanel.jsx"
import { GeneSizePanel }  from "./inputs/GeneSizePanel.jsx"
import { SlidePanel }     from "./inputs/SlidePanel.jsx"
import { MorphPanel }     from "./inputs/MorphPanel.jsx"
import { OrganizePanel }  from "./inputs/OrganizePanel.jsx"
import { SosPanel }       from "./inputs/SosPanel.jsx"

export function ChartPanel({ inp, currentCV, timeDomain, isPlaying, firmOpts, T, col, spliceCount, modSrc, windowSize = 5 }) {
  const cv   = currentCV
  const sCV  = snap1(clamp(cv, inp.min, inp.max))
  const TT   = useMemo(() => makeTooltip(T), [T])
  const dotR = isPlaying ? 7 : 5

  const previewWindow = isPlaying ? windowSize : getPreviewWindow(modSrc, windowSize)

  function smartTicks(totalSecs, offsetFrom = 0) {
    const step  = totalSecs <= 5 ? 1 : totalSecs <= 20 ? 2 : totalSecs <= 40 ? 5 : 10
    const count = Math.floor(totalSecs / step)
    return Array.from({ length: count + 1 }, (_, i) => +(offsetFrom + i * step).toFixed(3))
  }

  const panelProps = { cv, sCV, dotR, TT, T, col, firmOpts, spliceCount }

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingBottom: 32 }}>

      {/* Meta pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {inp.meta.map((m, i) => <Pill key={i} color={col}>{m}</Pill>)}
      </div>

      {/* Shared: CV-over-time modulation preview */}
      {timeDomain.length > 0 && (<>
        <ChartTitle T={T} mt={0}>CV Over Time — Modulation Preview</ChartTitle>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={timeDomain} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="t" stroke={T.border2}
              tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
              domain={isPlaying && timeDomain.length > 0
                ? [timeDomain[0].t, timeDomain[0].t + windowSize]
                : [0, previewWindow]}
              ticks={isPlaying && timeDomain.length > 0
                ? smartTicks(windowSize, timeDomain[0].t)
                : smartTicks(previewWindow)}
              tickFormatter={v => {
                const rel     = isPlaying && timeDomain.length > 0 ? v - timeDomain[0].t : v
                const rounded = +rel.toFixed(1)
                return rounded === previewWindow || rounded === windowSize ? `${rounded}s` : String(rounded)
              }}
              type="number"
            />
            <YAxis stroke={T.border2} tick={{ fill: T.muted, fontSize: 10, fontFamily: MF }}
              domain={[inp.min, inp.max]}
              tickFormatter={v => v === inp.max ? `${v}V` : String(v)}
            />
            {isPlaying && timeDomain.length > 0 && (
              <ReferenceLine x={timeDomain[0].t} stroke={col} strokeWidth={2} opacity={0.85} />
            )}
            <defs>
              <linearGradient id={`td-${inp.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={col} stopOpacity={0.35} />
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

      {/* Input-specific panels */}
      {inp.id === "varispeed" && <VarispeedPanel {...panelProps} />}
      {inp.id === "genesize"  && <GeneSizePanel  {...panelProps} />}
      {inp.id === "slide"     && <SlidePanel      {...panelProps} />}
      {inp.id === "morph"     && <MorphPanel      {...panelProps} />}
      {inp.id === "organize"  && <OrganizePanel   {...panelProps} />}
      {inp.id === "sos"       && <SosPanel        {...panelProps} />}

    </div>
  )
}
