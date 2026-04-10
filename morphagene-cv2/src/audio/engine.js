// ── Morphagene CV Audio Engine ───────────────────────────────────────────────
//
// Demonstrates the audible effect of each CV input using Web Audio API.
// Each input has its own synthesis voice that morphs in response to the
// current CV value, so users can HEAR what modulation does — not just see it.
//
// Architecture:
//   AudioEngine class  →  singleton, created once on first user interaction
//   useAudioEngine()   →  React hook that manages lifecycle and exposes controls
//
// Sound design per input:
//   VARI-SPEED  → looped oscillator, pitch tracks the speed multiplier
//   GENE SIZE   → granular-style filtered noise burst, window length tracks grain%
//   SLIDE       → filtered drone, filter cutoff tracks position
//   MORPH       → layered oscillators, active count tracks grain stage
//   ORGANIZE    → pitched click/blip on splice change
//   SOS         → crossfade between "live" noise and "buffer" tone

// ── Base sample frequency for pitch reference (A3 = 220Hz) ──────────────────
const BASE_FREQ = 220

class AudioEngine {
  constructor() {
    this.ctx        = null
    this.masterGain = null
    this.voices     = {}   // keyed by input id
    this._ready     = false
  }

  // Call once after a user gesture (click / tap)
  async init() {
    if (this._ready) return
    this.ctx        = new (window.AudioContext || window.webkitAudioContext)()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.35
    this.masterGain.connect(this.ctx.destination)
    this._ready = true
  }

  get ready() { return this._ready }

  resume() {
    if (this.ctx?.state === "suspended") this.ctx.resume()
  }

  suspend() {
    if (this.ctx?.state === "running") this.ctx.suspend()
  }

  setMasterVolume(v) {
    if (!this._ready) return
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  // ── Stop all voices ────────────────────────────────────────────────────────
  stopAll() {
    Object.values(this.voices).forEach(v => v?.stop?.())
    this.voices = {}
  }

  // ── VARI-SPEED ─────────────────────────────────────────────────────────────
  // Looping sawtooth whose pitch tracks the speed multiplier.
  // At CV=0 (stopped) → inaudible. Reverse → pitch drops, detune shifts.
  setVarispeed(cv, speedMultiplier) {
    if (!this._ready) return
    const key = "varispeed"
    if (!this.voices[key]) {
      const osc  = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = "sawtooth"
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start()
      this.voices[key] = { osc, gain }
    }
    const { osc, gain } = this.voices[key]
    const freq = Math.abs(speedMultiplier) * BASE_FREQ
    const vol  = Math.abs(speedMultiplier) < 0.05 ? 0 : 0.18
    osc.frequency.setTargetAtTime(Math.max(20, freq), this.ctx.currentTime, 0.08)
    // Detune slightly negative when reversed for audible cue
    osc.detune.setTargetAtTime(cv < 0 ? -30 : 0, this.ctx.currentTime, 0.1)
    gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.08)
  }

  // ── GENE SIZE ──────────────────────────────────────────────────────────────
  // Filtered noise whose filter Q and frequency track grain window size.
  // Large grains → warm, open noise. Small grains → narrow bandpass clicks.
  setGeneSize(cv, grainPct) {
    if (!this._ready) return
    const key = "genesize"
    if (!this.voices[key]) {
      const bufSize = this.ctx.sampleRate * 2
      const buffer  = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
      const data    = buffer.getChannelData(0)
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

      const src    = this.ctx.createBufferSource()
      src.buffer   = buffer
      src.loop     = true

      const filter = this.ctx.createBiquadFilter()
      filter.type  = "bandpass"

      const gain   = this.ctx.createGain()
      src.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain)
      src.start()
      this.voices[key] = { src, filter, gain }
    }
    const { filter, gain } = this.voices[key]
    // grainPct 100→0: large grains = low cutoff wide, small = high narrow
    const freq = 200 + (1 - grainPct / 100) * 3000
    const q    = 1 + (1 - grainPct / 100) * 18
    filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1)
    filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.1)
    gain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.05)
  }

  // ── SLIDE ──────────────────────────────────────────────────────────────────
  // Drone tone with filter sweep tracking playhead position.
  // Position 0% → dark/low. Position 100% → bright/high.
  setSlide(cv, posPct) {
    if (!this._ready) return
    const key = "slide"
    if (!this.voices[key]) {
      const osc    = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      const gain   = this.ctx.createGain()
      osc.type     = "triangle"
      filter.type  = "lowpass"
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain)
      osc.frequency.value = BASE_FREQ
      osc.start()
      this.voices[key] = { osc, filter, gain }
    }
    const { filter, gain } = this.voices[key]
    const cutoff = 300 + (posPct / 100) * 4000
    filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.12)
    gain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.05)
  }

  // ── MORPH ──────────────────────────────────────────────────────────────────
  // Layered oscillators — active count matches grain stage (0–4).
  // Stage 0: silence. Stage 4: four detuned oscillators + random pitch scatter.
  setMorph(cv, stage) {
    if (!this._ready) return
    const key = "morph"

    // Rebuild voices when stage changes layer count
    if (!this.voices[key] || this.voices[key].stage !== stage) {
      // Tear down old
      if (this.voices[key]) {
        this.voices[key].oscs.forEach(o => { try { o.stop() } catch (_) {} })
      }

      if (stage === 0) {
        this.voices[key] = { oscs: [], gains: [], stage }
        return
      }

      // Pitch intervals per stage (semitones above base)
      const intervals = [
        [],
        [0],
        [0, 7],
        [0, 7, 12],
        [0, 7, 12, 19],
      ][stage]

      const oscs  = []
      const gains = []
      intervals.forEach(semitones => {
        const osc  = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type   = "sine"
        osc.frequency.value = BASE_FREQ * Math.pow(2, semitones / 12)
        osc.detune.value    = (Math.random() - 0.5) * 8   // subtle natural detune
        gain.gain.value     = 0.12 / stage
        osc.connect(gain)
        gain.connect(this.masterGain)
        osc.start()
        oscs.push(osc)
        gains.push(gain)
      })
      this.voices[key] = { oscs, gains, stage }
    }
  }

  // ── ORGANIZE ───────────────────────────────────────────────────────────────
  // Pitched click when splice selection changes — like a sequencer step trigger.
  triggerOrganize(spliceIndex) {
    if (!this._ready) return
    const freq = 220 * Math.pow(2, (spliceIndex % 12) / 12)
    const osc  = this.ctx.createOscillator()
    const env  = this.ctx.createGain()
    osc.type   = "sine"
    osc.frequency.value = freq
    env.gain.setValueAtTime(0.25, this.ctx.currentTime)
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12)
    osc.connect(env)
    env.connect(this.masterGain)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.15)
  }

  // ── SOS ────────────────────────────────────────────────────────────────────
  // Crossfade between filtered noise ("live input") and sine tone ("buffer loop").
  setSOS(cv, liveAmt, bufferAmt) {
    if (!this._ready) return
    const key = "sos"
    if (!this.voices[key]) {
      // Live = filtered noise
      const bufSize  = this.ctx.sampleRate * 2
      const buffer   = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
      const data     = buffer.getChannelData(0)
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
      const noise    = this.ctx.createBufferSource()
      noise.buffer   = buffer
      noise.loop     = true
      const noiseF   = this.ctx.createBiquadFilter()
      noiseF.type    = "lowpass"
      noiseF.frequency.value = 1200
      const liveGain = this.ctx.createGain()
      noise.connect(noiseF)
      noiseF.connect(liveGain)
      liveGain.connect(this.masterGain)
      noise.start()

      // Buffer = sine tone (loop metaphor)
      const osc     = this.ctx.createOscillator()
      const bufGain = this.ctx.createGain()
      osc.type      = "sine"
      osc.frequency.value = BASE_FREQ * 1.5
      osc.connect(bufGain)
      bufGain.connect(this.masterGain)
      osc.start()

      this.voices[key] = { noise, liveGain, osc, bufGain }
    }
    const { liveGain, bufGain } = this.voices[key]
    liveGain.gain.setTargetAtTime(liveAmt * 0.2, this.ctx.currentTime, 0.08)
    bufGain.gain.setTargetAtTime(bufferAmt * 0.2, this.ctx.currentTime, 0.08)
  }

  // ── Silence all voices except the active one ──────────────────────────────
  setActiveVoice(id) {
    if (!this._ready) return
    const t = this.ctx.currentTime
    Object.entries(this.voices).forEach(([key, voice]) => {
      if (!voice || key === id) return
      if (key === "morph") {
        voice.gains?.forEach(g => g.gain.setTargetAtTime(0, t, 0.05))
      } else if (key === "sos") {
        voice.liveGain?.gain.setTargetAtTime(0, t, 0.05)
        voice.bufGain?.gain.setTargetAtTime(0, t, 0.05)
      } else {
        voice.gain?.gain.setTargetAtTime(0, t, 0.05)
      }
    })
  }

  destroy() {
    this.stopAll()
    this.ctx?.close()
    this._ready = false
  }
}

// Singleton instance
let _engine = null
export function getAudioEngine() {
  if (!_engine) _engine = new AudioEngine()
  return _engine
}
