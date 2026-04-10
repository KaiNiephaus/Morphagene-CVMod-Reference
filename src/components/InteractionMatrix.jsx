import { useState } from "react"
import { INPUTS, INPUT_MAP } from "../data/inputs.js"
import { MATRIX_CELLS } from "../data/matrixCells.js"

const MF = "'DM Mono','Fira Code',monospace"

const LEVEL_STYLE = [
  null,
  { bg: "#1a1a36", bd: "#33335a", col: "#8888cc" },
  { bg: "#1a2e1a", bd: "#2a4a2a", col: "#88bb88" },
  { bg: "#2a1a36", bd: "#4a2a5a", col: "#cc88ff" },
]

function getCell(a, b) {
  const key1 = `${a}-${b}`
  const key2 = `${b}-${a}`
  return MATRIX_CELLS[key1] || MATRIX_CELLS[key2] || null
}

// ── InteractionMatrix ────────────────────────────────────────────────────────
// 6×6 grid showing notable cross-input patch combinations.
// Hover to read description, click to jump to that input.

export function InteractionMatrix({ onSelectPair, getColor, T }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ paddingBottom: 24 }}>
      <p style={{ fontFamily: MF, fontSize: 12, color: T.muted, marginBottom: 16, lineHeight: 1.7 }}>
        Hover any highlighted cell to see the patch interaction. Click to jump to that input.
      </p>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        {[1, 2, 3].map(l => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 2,
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
              <th style={{ width: 60 }} />
              {INPUTS.map(inp => (
                <th key={inp.id} style={{
                  padding: "6px 4px", fontFamily: MF, fontSize: 9,
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
                  padding: "4px 10px 4px 0", fontFamily: MF, fontSize: 9,
                  color: getColor(row.id), letterSpacing: "0.08em",
                  borderRight: `1px solid ${T.border}`, textAlign: "right",
                }}>
                  {row.short}
                </td>
                {INPUTS.map(col2 => {
                  if (row.id === col2.id) return (
                    <td key={col2.id} style={{ padding: 3 }}>
                      <div style={{
                        width: 40, height: 30, background: T.surface2, borderRadius: 2,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: getColor(row.id), opacity: 0.6 }} />
                      </div>
                    </td>
                  )

                  const cell = getCell(row.id, col2.id)
                  const hk   = `${row.id}-${col2.id}`
                  const isH  = hovered === hk || hovered === `${col2.id}-${row.id}`

                  if (!cell) return (
                    <td key={col2.id} style={{ padding: 3 }}>
                      <div style={{ width: 40, height: 30, background: T.dim, borderRadius: 2, opacity: 0.4 }} />
                    </td>
                  )

                  const ls = LEVEL_STYLE[cell.level]
                  return (
                    <td key={col2.id} style={{ padding: 3 }}>
                      <div
                        onMouseEnter={() => setHovered(hk)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => onSelectPair(row.id, col2.id)}
                        style={{
                          width: 40, height: 30, borderRadius: 2, cursor: "pointer",
                          background: isH ? ls.bg + "cc" : ls.bg,
                          border: `1px solid ${isH ? ls.col : ls.bd}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.1s",
                        }}
                      >
                        <span style={{ fontSize: cell.level === 3 ? 13 : cell.level === 2 ? 11 : 9, color: ls.col }}>
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

      {/* Description box */}
      <div style={{
        marginTop: 16, minHeight: 90, padding: "12px 14px",
        background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 3,
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
            Hover a cell to see the patch interaction description
          </span>
        )}
      </div>
    </div>
  )
}
