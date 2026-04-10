// ── Core math helpers ────────────────────────────────────────────────────────

export const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v))
export const snap1 = v => Math.round(v * 10) / 10

// ── Per-input parameter calculations ────────────────────────────────────────

/**
 * Returns speed multiplier and semitone offset for a given Vari-Speed CV and firmware mode.
 * vsop: 0 = standard asymmetric, 1 = 1V/Oct bidir, 2 = 1V/Oct fwd only
 */
export function getVSMetrics(cv, vsop = 0) {
  const st = vsop === 1
    ? cv * 12
    : vsop === 2
      ? Math.max(0, cv) * 12
      : cv >= 0 ? cv * 3 : cv * 6.5
  return {
    speed: +Math.pow(2, st / 12).toFixed(5),
    semitones: +st.toFixed(2),
  }
}

/**
 * Returns the Morph stage index (0–4) for a given CV value.
 * 0 = gap/silence, 1 = seamless, 2 = 2× overlap, 3 = 3× + pan, 4 = 4× + pitch scatter
 */
export function getMorphStage(cv) {
  const v = clamp(cv, 0, 5)
  return v < 0.8 ? 0 : v < 1.5 ? 1 : v < 2.8 ? 2 : v < 4 ? 3 : 4
}

// ── Curve data builders ──────────────────────────────────────────────────────
// These return arrays of { v, ... } suitable for Recharts charts.

export function vsPoints(vsop = 0) {
  return Array.from({ length: 81 }, (_, i) => {
    const v = -4 + i * 0.1
    const st = vsop === 1
      ? v * 12
      : vsop === 2
        ? Math.max(0, v) * 12
        : v >= 0 ? v * 3 : v * 6.5
    return { v: +v.toFixed(2), speed: +Math.pow(2, st / 12).toFixed(5), st: +st.toFixed(2) }
  })
}

export const gsPoints = () =>
  Array.from({ length: 81 }, (_, i) => {
    const v = i * 0.1
    return { v: +v.toFixed(1), grainPct: +((1 - v / 8) * 100).toFixed(2) }
  })

export const slPoints = () =>
  Array.from({ length: 81 }, (_, i) => {
    const v = i * 0.1
    return { v: +v.toFixed(1), pos: +(v / 8 * 100).toFixed(2) }
  })

export const moPoints = () =>
  Array.from({ length: 51 }, (_, i) => {
    const v = i * 0.1
    const d = v < 0.8 ? 0.2 : v < 1.5 ? 1 : v < 2.8 ? 2 : v < 4 ? 3 : 4
    return { v: +v.toFixed(1), density: d }
  })

export const orPoints = n =>
  Array.from({ length: n }, (_, i) => ({
    splice: i + 1,
    threshold: +((i / n) * 5).toFixed(3),
  }))

export const sosPoints = () =>
  Array.from({ length: 81 }, (_, i) => {
    const v = i * 0.1
    return { v: +v.toFixed(1), live: +(1 - v / 8).toFixed(4), buf: +(v / 8).toFixed(4) }
  })

// ── Modulation engine ────────────────────────────────────────────────────────

export const DEFAULT_MOD = {
  type: "static",
  staticVal: 0,
  shape: "sine",
  rate: 0.3,
  amplitude: 1.0,
  attackTime: 0.15,
  decayTime: 0.4,
}

/**
 * Compute the CV value produced by a mod source at time t for a given input.
 * @param {object} src   - mod source config (type, shape, rate, amplitude, etc.)
 * @param {number} t     - current time in seconds
 * @param {object} inp   - input definition (min, max)
 * @returns {number}     - CV voltage clamped to inp range
 */
export function computeModCV(src, t, inp) {
  const { min, max } = inp
  const range  = max - min
  const center = min < 0 ? 0 : min + range * 0.5

  if (src.type === "static") return clamp(src.staticVal, min, max)

  if (src.type === "lfo") {
    const raw =
      src.shape === "sine"  ? Math.sin(t * src.rate * Math.PI * 2)
      : src.shape === "tri" ? 1 - 4 * Math.abs(((t * src.rate + 0.25) % 1) - 0.5)
      : src.shape === "saw" ? 2 * ((t * src.rate % 1)) - 1
      :                       1 - 2 * ((t * src.rate % 1))         // ramp
    return clamp(center + raw * (range * 0.5) * src.amplitude, min, max)
  }

  if (src.type === "envelope") {
    const period = 1 / Math.max(0.05, src.rate)
    const phase  = (t % period) / period
    const env    =
      phase < src.attackTime                       ? phase / src.attackTime
      : phase < src.attackTime + src.decayTime     ? 1 - (phase - src.attackTime) / src.decayTime
      :                                              0
    return clamp(min + env * range * src.amplitude, min, max)
  }

  if (src.type === "sh") {
    const step = Math.floor(Math.max(0, t) * src.rate)
    // Mulberry32 — good distribution for small integers
    let z = (step + 0x6D2B79F5) >>> 0
    z = Math.imul(z ^ z >>> 15, z | 1)
    z ^= z + Math.imul(z ^ z >>> 7, z | 61)
    const hash = ((z ^ z >>> 14) >>> 0) / 0xffffffff
    return clamp(min + hash * range * src.amplitude, min, max)
  }

  return center
}

/**
 * Build an array of { t, cv } samples for the time-domain preview chart.
 * @param {object} src     - mod source
 * @param {object} inp     - input definition
 * @param {number} seconds - preview window length
 * @param {number} res     - number of samples
 */
export function buildTimeDomain(src, inp, seconds = 5, res = 200) {
  if (src.type === "sh") {
    const stepDuration = 1 / Math.max(0.05, src.rate)
    const totalSteps   = Math.ceil(seconds / stepDuration)
    const points       = []
    for (let s = 0; s < totalSteps; s++) {
      const tStart = +(s * stepDuration).toFixed(3)
      const tEnd   = +(Math.min((s + 1) * stepDuration, seconds)).toFixed(3)
      const cv     = +computeModCV(src, tStart + 0.0001, inp).toFixed(4)
      points.push({ t: tStart, cv })
      points.push({ t: tEnd - 0.001, cv })
    }
    return points
  }
  return Array.from({ length: res }, (_, i) => {
    const t = (i / res) * seconds
    return { t: +t.toFixed(3), cv: +computeModCV(src, t, inp).toFixed(4) }
  })
}
