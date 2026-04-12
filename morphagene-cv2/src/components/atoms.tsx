// ── Shared atom components ───────────────────────────────────────────────────
// Small, stateless building blocks used across the app.

import type { ReactNode, CSSProperties } from "react"
import type { Theme } from "../types"
import { MF } from "../theme"

export function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 2,
      background: color + "1a", border: `1px solid ${color}44`,
      fontFamily: MF, fontSize: 11, color, letterSpacing: "0.05em",
    }}>
      {children}
    </span>
  )
}

export function Label({ children, T, style }: { children: ReactNode; T: Theme; style?: CSSProperties }) {
  return (
    <div style={{
      fontFamily: MF, fontSize: 11, color: T.label,
      textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, ...style,
    }}>
      {children}
    </div>
  )
}

interface StatItem { label: string; value: string; hi?: string }

export function StatBlock({ items, T }: { items: StatItem[]; T: Theme }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`,
      gap: 6, marginBottom: 14,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          background: T.surface2, border: `1px solid ${T.border}`,
          padding: "8px 10px", borderRadius: 3,
        }}>
          <div style={{ fontFamily: MF, fontSize: 10, color: T.muted, marginBottom: 4 }}>{it.label}</div>
          <div style={{ fontFamily: MF, fontSize: 13, color: it.hi ?? T.text, fontWeight: 500 }}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}

export function ChartTitle({ children, T, mt }: { children: ReactNode; T: Theme; mt?: number }) {
  return (
    <div style={{
      fontFamily: MF, fontSize: 10, color: T.muted,
      textTransform: "uppercase", letterSpacing: "0.1em",
      marginBottom: 6, marginTop: mt ?? 14,
    }}>
      {children}
    </div>
  )
}

export function Note({ children, T }: { children: ReactNode; T: Theme }) {
  return (
    <div style={{
      margin: "14px 0 0", padding: "10px 13px",
      background: T.surface2, borderLeft: `2px solid ${T.border2}`,
      fontFamily: MF, fontSize: 12, color: T.muted, lineHeight: 1.7,
    }}>
      {children}
    </div>
  )
}

export function Mono({ children, T }: { children: ReactNode; T: Theme }) {
  return (
    <code style={{
      background: T.dim, padding: "1px 5px", borderRadius: 2,
      fontFamily: MF, fontSize: 11, color: T.text, border: `1px solid ${T.border}`,
    }}>
      {children}
    </code>
  )
}

// Returns a Recharts-compatible tooltip component for a given theme
export function makeTooltip(T: Theme) {
  return ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: unknown; color?: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: T.tooltip, border: `1px solid ${T.border2}`,
        padding: "8px 12px", fontFamily: MF, fontSize: 11, color: T.text,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }}>
        <div style={{ color: T.muted, marginBottom: 4 }}>CV {label}V</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color ?? T.text }}>
            {p.name}: {typeof p.value === "number" ? p.value.toFixed(3) : String(p.value)}
          </div>
        ))}
      </div>
    )
  }
}
