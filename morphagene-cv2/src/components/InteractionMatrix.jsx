import { useState } from "react"
import { INPUTS, INPUT_MAP } from "../data/inputs.js"
import { MATRIX_CELLS } from "../data/matrixCells.js"
import { MF } from "../theme.js"

const LEVEL_STYLE = [
  null,
  { bg: "#1a1a36", bd: "#33335a", col: "#8888cc" },
  { bg: "#1a2e1a", bd: "#2a4a2a", col: "#88bb88" },
  { bg: "#2a1a36", bd: "#4a2a5a", col: "#cc88ff" },
]

const LABEL_COL = 64
const CELL_W    = 64
const CELL_PAD  = 4
// Total table width — used to pin the info box so it never changes size on hover
const MATRIX_W  = LABEL_COL + 6 * (CELL_W + CELL_PAD * 2)   // 496px

function getCell(a, b) {
  const key1 = `${a}-${b}`
  const key2 = `${b}-${a}`
  return MATRIX_CELLS[key1] || MATRIX_CELLS[key2] || null
}

export function InteractionMatrix({ onSelect, getColor, T }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%" }}>
      <p style={{ fontFamily: MF, fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.7 }}>
        Hover or tap any cell to explore how the combination of two functions <br />can be utilized to create a starting point for specific audio effects.
      </p>

      
      <div style={{ width: MATRIX_W }}>

        {/* Legend — indented to align with grid cells */}
        <div style={{ display: "flex", gap: 16, marginBottom: 14, paddingLeft: LABEL_COL, flexWrap: "wrap" }}>
          {[1, 2, 3].map(l => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 2,
                background: LEVEL_STYLE[l].bg, border: `1px solid ${LEVEL_STYLE[l].bd}`,
              }} />
              <span style={{ fontFamily: MF, fontSize: 11, color: T.muted }}>
                {l === 1 ? "Subtle" : l === 2 ? "Productive" : "High Synergy"}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ width: LABEL_COL }} />
                {INPUTS.map(inp => (
                  <th key={inp.id} style={{
                    padding: "7px 4px", fontFamily: MF, fontSize: 10,
                    color: getColor(inp.id), letterSpacing: "0.08em", textAlign: "center",
                    borderBottom: `1px solid ${T.border}`,
                  }}>
                    {inp.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INPUTS.map(row => (
                <tr key={row.id}>
                  <td style={{
                    padding: "4px 12px 4px 0", fontFamily: MF, fontSize: 10,
                    color: getColor(row.id), letterSpacing: "0.08em",
                    borderRight: `1px solid ${T.border}`, textAlign: "right",
                  }}>
                    {row.short}
                  </td>
                  {INPUTS.map(col2 => {
                    if (row.id === col2.id) return (
                      <td key={col2.id} style={{ padding: 4 }}>
                        <div style={{
                          width: 64, height: 44, background: T.surface2, borderRadius: 3,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: getColor(row.id), opacity: 0.5 }} />
                        </div>
                      </td>
                    )

                    const cell = getCell(row.id, col2.id)
                    const hk   = `${row.id}-${col2.id}`
                    const isH  = hovered === hk || hovered === `${col2.id}-${row.id}`

                    if (!cell) return (
                      <td key={col2.id} style={{ padding: 4 }}>
                        <div style={{ width: 64, height: 44, background: T.dim, borderRadius: 3, opacity: 0.35 }} />
                      </td>
                    )

                    const ls = LEVEL_STYLE[cell.level]
                    return (
                      <td key={col2.id} style={{ padding: 4 }}>
                        <div
                          onMouseEnter={() => setHovered(hk)}
                          onMouseLeave={() => setHovered(null)}
                          onTouchStart={e => { e.preventDefault(); setHovered(hk) }}
                          style={{
                            width: 64, height: 44, borderRadius: 3, cursor: "pointer",
                            background: isH ? ls.bg + "cc" : ls.bg,
                            border: `1px solid ${isH ? ls.col : ls.bd}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.1s",
                          }}
                        >
                          <span style={{ fontSize: cell.level === 3 ? 15 : cell.level === 2 ? 13 : 10, color: ls.col }}>
                            {cell.level === 3 ? "★" : cell.level === 2 ? "◆" : "·"}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Description box — width matches table via fit-content parent */}
        <div style={{
          marginTop: 16, minHeight: 100, padding: "14px 16px",
          width: MATRIX_W, boxSizing: "border-box",
          background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 3,
          overflow: "hidden",
        }}>
          {hovered ? (() => {
            const mk   = [hovered, hovered.split("-").reverse().join("-")].find(k => MATRIX_CELLS[k])
            const cell = mk ? MATRIX_CELLS[mk] : null
            if (!cell) return <span style={{ fontFamily: MF, fontSize: 12, color: T.muted }}>—</span>
            const [a, b] = mk.split("-")
            return (<>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: MF, fontSize: 12, color: getColor(a), fontWeight: 500 }}>{INPUT_MAP[a]?.label}</span>
                <span style={{ fontFamily: MF, fontSize: 11, color: T.muted }}>×</span>
                <span style={{ fontFamily: MF, fontSize: 12, color: getColor(b), fontWeight: 500 }}>{INPUT_MAP[b]?.label}</span>
                <span style={{ marginLeft: "auto", fontFamily: MF, fontSize: 11, color: LEVEL_STYLE[cell.level].col }}>{cell.title}</span>
              </div>
              <div style={{ fontFamily: MF, fontSize: 12, color: T.muted, lineHeight: 1.7 }}>{cell.desc}</div>
            </>)
          })() : (
            <span style={{ fontFamily: MF, fontSize: 12, color: T.muted }}>
              Hover or tap a cell to see the patch interaction
            </span>
          )}
        </div>

      </div>
    </div>
  )
}
