// ── Shared TypeScript types ───────────────────────────────────────────────────
// Single source of truth for all interfaces used across the app.

// ── Input IDs ─────────────────────────────────────────────────────────────────
export type InputId = "varispeed" | "genesize" | "slide" | "morph" | "organize" | "sos"

// ── Data layer ────────────────────────────────────────────────────────────────
export interface FirmwareOption {
  key: string
  label: string
  options: string[]
}

export interface CVInput {
  id: InputId
  label: string
  short: string
  min: number
  max: number
  defaultCv: number
  firmware: FirmwareOption[]
  meta: string[]
  description: string
}

// ── Modulation ────────────────────────────────────────────────────────────────
export type ModType  = "static" | "lfo" | "envelope" | "sh"
export type LFOShape = "sine" | "tri" | "saw" | "ramp"

// All mod source types share the same fields — type discriminates behaviour.
export interface ModSource {
  type:       ModType
  staticVal:  number
  shape:      LFOShape
  rate:       number
  amplitude:  number
  attackTime: number
  decayTime:  number
}

export type ModSourceMap = Record<InputId, ModSource>

// ── Firmware options ──────────────────────────────────────────────────────────
export interface FirmOpts {
  vsop: number
  gnsm: number
  ckop: number
  omod: number
  inop: number
}

// ── Chart data ────────────────────────────────────────────────────────────────
export interface TimeDomainPoint {
  t:  number
  cv: number
}

export interface StatItem {
  label: string
  value: string
  hi?:   string
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export interface Theme {
  bg:       string
  surface:  string
  surface2: string
  border:   string
  border2:  string
  text:     string
  muted:    string
  dim:      string
  panel:    string
  label:    string
  track:    string
  tooltip:  string
}

export type ColorMap = Record<InputId, string>
