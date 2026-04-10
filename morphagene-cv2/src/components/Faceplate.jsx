import { INPUT_MAP, INPUTS } from "../data/inputs.js"

// ── Faceplate ────────────────────────────────────────────────────────────────
// SVG illustration of the Morphagene panel.
// Clicking a row selects that input. Live CV bars update in real time.

const ROWS = [
  { id: "varispeed", ky: 55,  jy: 74  },
  { id: "genesize",  ky: 106, jy: 125 },
  { id: "slide",     ky: 157, jy: 176 },
  { id: "morph",     ky: 208, jy: 227 },
  { id: "organize",  ky: 259, jy: 278 },
  { id: "sos",       ky: 310, jy: 329 },
]

export function Faceplate({ activeId, onSelect, animCV, getColor, T }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingBottom: 10 }}>
      <svg width={114} height={395} style={{ overflow: "visible" }}>
        {/* Panel body */}
        <rect x={2} y={2} width={110} height={391} rx={4} fill={T.surface2} stroke={T.border} strokeWidth={1.5} />

        {/* Mounting holes */}
        {[12, 383].map(y => (
          <circle key={y} cx={57} cy={y} r={4.5} fill={T.dim} stroke={T.border} strokeWidth={1} />
        ))}

        {/* Module name */}
        <text x={57} y={28} textAnchor="middle" fontFamily="'DM Mono',monospace" fontSize={7}
          fill={T.muted} letterSpacing={2.5}>MORPHAGENE</text>

        {ROWS.map(({ id, ky, jy }) => {
          const inp   = INPUT_MAP[id]
          const col   = getColor(id)
          const isAct = id === activeId
          const cv    = animCV[id] ?? inp.defaultCv
          const norm  = (cv - inp.min) / (inp.max - inp.min)
          const ang   = (norm * 270 - 135) * Math.PI / 180

          return (
            <g key={id} style={{ cursor: "pointer" }} onClick={() => onSelect(id)}>
              {/* Row highlight */}
              <rect x={8} y={ky - 20} width={98} height={47} rx={3}
                fill={isAct ? col + "14" : "transparent"}
                stroke={isAct ? col + "38" : "transparent"} strokeWidth={1} />

              {/* Knob */}
              <circle cx={30} cy={ky} r={12} fill={T.dim} stroke={col} strokeWidth={isAct ? 1.8 : 0.8} />
              <line
                x1={30} y1={ky}
                x2={30 + Math.sin(ang) * 9} y2={ky - Math.cos(ang) * 9}
                stroke={col} strokeWidth={isAct ? 2 : 1.2} strokeLinecap="round"
              />

              {/* Jack */}
              <circle cx={30} cy={jy} r={6.5} fill={T.surface} stroke={col} strokeWidth={isAct ? 1.8 : 0.8} />
              <circle cx={30} cy={jy} r={2.8} fill={isAct ? col : T.dim} />

              {/* Label */}
              <text x={47} y={ky + 1} fontFamily="'DM Mono',monospace" fontSize={8.5}
                fill={col} fontWeight={isAct ? "600" : "400"} letterSpacing={0.5}>
                {inp.short}
              </text>
              <text x={47} y={ky + 12} fontFamily="'DM Mono',monospace" fontSize={7}
                fill={T.muted} letterSpacing={0.3}>
                {inp.label}
              </text>

              {/* CV level bar */}
              <rect x={90} y={ky - 11} width={7} height={22} rx={2} fill={T.track} />
              <rect
                x={90} y={ky - 11 + 22 * (1 - norm)}
                width={7} height={22 * norm} rx={2}
                fill={col} opacity={0.8}
              />
            </g>
          )
        })}

        {/* Bottom jack row label */}
        <text x={57} y={370} textAnchor="middle" fontFamily="'DM Mono',monospace"
          fontSize={7} fill={T.muted} opacity={0.6}>
          IN · OUT · REC · CLK
        </text>
        {[18, 30, 42, 54, 66, 78].map((x, i) => (
          <circle key={i} cx={x} cy={381} r={4} fill={T.dim} stroke={T.border} strokeWidth={0.8} />
        ))}
      </svg>
    </div>
  )
}
