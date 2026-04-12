// ── Shared constants ─────────────────────────────────────────────────────────

export const MF = "'DM Mono','Fira Code',monospace"

/** Appends a 2-digit hex alpha to a 6-digit hex color string. opacity 0–1. */
export function withAlpha(hex, opacity) {
  const a = Math.round(clamp01(opacity) * 255).toString(16).padStart(2, "0")
  return hex + a
}

function clamp01(v) { return Math.max(0, Math.min(1, v)) }

// ── Theme colour tokens ──────────────────────────────────────────────────────

export const DARK = {
  bg: "#0a0a14", surface: "#14141e", surface2: "#1e1e2c",
  border: "#2e2e44", border2: "#3e3e5a",
  text: "#e4e4f0", muted: "#9090b8", dim: "#1a1a28",
  panel: "#0e0e1a", label: "#7070a0",
  track: "#232338", tooltip: "#14141e",
}

export const LIGHT = {
  bg: "#eceaf4", surface: "#ffffff", surface2: "#f0eef8",
  border: "#c4c0dc", border2: "#a8a4c8",
  text: "#0c0a20", muted: "#5a5878", dim: "#dedce8",
  panel: "#f6f4ff", label: "#7070a0",
  track: "#d8d4ec", tooltip: "#ffffff",
}

// Per-input accent colours — dark vs light variants
export const DARK_COLORS = {
  varispeed: "#00e5ff",
  genesize:  "#ff9800",
  slide:     "#55dd33",
  morph:     "#dd44ff",
  organize:  "#ffe033",
  sos:       "#ff3f7f",
}

export const LIGHT_COLORS = {
  varispeed: "#006e8a",
  genesize:  "#b85800",
  slide:     "#206e20",
  morph:     "#7700bb",
  organize:  "#847000",
  sos:       "#c40040",
}
