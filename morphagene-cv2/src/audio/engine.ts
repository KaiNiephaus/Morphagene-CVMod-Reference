// ── Morphagene CV Audio Engine ───────────────────────────────────────────────
//
// Demonstrates the audible effect of each CV input using Web Audio API.
// Each input has its own synthesis voice that morphs in response to the
// current CV value, so users can HEAR what modulation does — not just see it.

// ── Voice types ──────────────────────────────────────────────────────────────
interface OscVoice    { osc: OscillatorNode; gain: GainNode }
interface FilterVoice { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode }
interface SlideVoice  { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode }
interface MorphVoice  { oscs: OscillatorNode[]; gains: GainNode[]; stage: number }
interface SOSVoice    { noise: AudioBufferSourceNode; liveGain: GainNode; osc: OscillatorNode; bufGain: GainNode }

interface VoiceMap {
  varispeed?: OscVoice
  genesize?:  FilterVoice
  slide?:     SlideVoice
  morph?:     MorphVoice
  sos?:       SOSVoice
}

// ── Base sample frequency for pitch reference (A3 = 220Hz) ──────────────────
const BASE_FREQ = 220

class AudioEngine {
  ctx:        AudioContext | null = null
  masterGain: GainNode    | null = null
  private voices: VoiceMap = {}
  private _ready = false

  async init(): Promise<void> {
    if (this._ready) return
    this.ctx        = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 0.35
    this.masterGain.connect(this.ctx.destination)
    this._ready = true
  }

  get ready(): boolean { return this._ready }

  resume(): void {
    if (this.ctx?.state === "suspended") void this.ctx.resume()
  }

  suspend(): void {
    if (this.ctx?.state === "running") void this.ctx.suspend()
  }

  // ── Stop all voices ────────────────────────────────────────────────────────
  stopAll(): void {
    const { varispeed, genesize, slide, morph, sos } = this.voices
    if (varispeed) { try { varispeed.osc.stop()   } catch (_) {} }
    if (genesize)  { try { genesize.src.stop()    } catch (_) {} }
    if (slide)     { try { slide.osc.stop()        } catch (_) {} }
    if (morph)     morph.oscs.forEach(o => { try { o.stop() } catch (_) {} })
    if (sos)       { try { sos.noise.stop(); sos.osc.stop() } catch (_) {} }
    this.voices = {}
  }

  // ── VARI-SPEED ─────────────────────────────────────────────────────────────
  setVarispeed(cv: number, speedMultiplier: number): void {
    if (!this._ready || !this.ctx || !this.masterGain) return
    if (!this.voices.varispeed) {
      const osc  = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = "sawtooth"
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start()
      this.voices.varispeed = { osc, gain }
    }
    const { osc, gain } = this.voices.varispeed
    const freq = Math.abs(speedMultiplier) * BASE_FREQ
    const vol  = Math.abs(speedMultiplier) < 0.05 ? 0 : 0.18
    osc.frequency.setTargetAtTime(Math.max(20, freq), this.ctx.currentTime, 0.08)
    osc.detune.setTargetAtTime(cv < 0 ? -30 : 0, this.ctx.currentTime, 0.1)
    gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.08)
  }

  // ── GENE SIZE ──────────────────────────────────────────────────────────────
  setGeneSize(_cv: number, grainPct: number): void {
    if (!this._ready || !this.ctx || !this.masterGain) return
    if (!this.voices.genesize) {
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
      this.voices.genesize = { src, filter, gain }
    }
    const { filter, gain } = this.voices.genesize
    const freq = 200 + (1 - grainPct / 100) * 3000
    const q    = 1   + (1 - grainPct / 100) * 18
    filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1)
    filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.1)
    gain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.05)
  }

  // ── SLIDE ──────────────────────────────────────────────────────────────────
  setSlide(_cv: number, posPct: number): void {
    if (!this._ready || !this.ctx || !this.masterGain) return
    if (!this.voices.slide) {
      const osc    = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()
      const gain   = this.ctx.createGain()
      osc.type            = "triangle"
      filter.type         = "lowpass"
      osc.frequency.value = BASE_FREQ
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain)
      osc.start()
      this.voices.slide = { osc, filter, gain }
    }
    const { filter, gain } = this.voices.slide
    filter.frequency.setTargetAtTime(300 + (posPct / 100) * 4000, this.ctx.currentTime, 0.12)
    gain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.05)
  }

  // ── MORPH ──────────────────────────────────────────────────────────────────
  setMorph(_cv: number, stage: number): void {
    if (!this._ready || !this.ctx || !this.masterGain) return
    if (!this.voices.morph || this.voices.morph.stage !== stage) {
      if (this.voices.morph)
        this.voices.morph.oscs.forEach(o => { try { o.stop() } catch (_) {} })
      if (stage === 0) {
        this.voices.morph = { oscs: [], gains: [], stage }
        return
      }
      const intervals = ([[], [0], [0, 7], [0, 7, 12], [0, 7, 12, 19]] as number[][])[stage]
      const oscs:  OscillatorNode[] = []
      const gains: GainNode[]       = []
      intervals.forEach(semitones => {
        const osc  = this.ctx!.createOscillator()
        const gain = this.ctx!.createGain()
        osc.type            = "sine"
        osc.frequency.value = BASE_FREQ * Math.pow(2, semitones / 12)
        osc.detune.value    = (Math.random() - 0.5) * 8
        gain.gain.value     = 0.12 / stage
        osc.connect(gain)
        gain.connect(this.masterGain!)
        osc.start()
        oscs.push(osc)
        gains.push(gain)
      })
      this.voices.morph = { oscs, gains, stage }
    }
  }

  // ── ORGANIZE ───────────────────────────────────────────────────────────────
  triggerOrganize(spliceIndex: number): void {
    if (!this._ready || !this.ctx || !this.masterGain) return
    const freq = 220 * Math.pow(2, (spliceIndex % 12) / 12)
    const osc  = this.ctx.createOscillator()
    const env  = this.ctx.createGain()
    osc.type            = "sine"
    osc.frequency.value = freq
    env.gain.setValueAtTime(0.25, this.ctx.currentTime)
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12)
    osc.connect(env)
    env.connect(this.masterGain)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.15)
  }

  // ── SOS ────────────────────────────────────────────────────────────────────
  setSOS(_cv: number, liveAmt: number, bufferAmt: number): void {
    if (!this._ready || !this.ctx || !this.masterGain) return
    if (!this.voices.sos) {
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
      const osc     = this.ctx.createOscillator()
      const bufGain = this.ctx.createGain()
      osc.type            = "sine"
      osc.frequency.value = BASE_FREQ * 1.5
      osc.connect(bufGain)
      bufGain.connect(this.masterGain)
      osc.start()
      this.voices.sos = { noise, liveGain, osc, bufGain }
    }
    const { liveGain, bufGain } = this.voices.sos
    liveGain.gain.setTargetAtTime(liveAmt  * 0.2, this.ctx.currentTime, 0.08)
    bufGain.gain.setTargetAtTime(bufferAmt * 0.2, this.ctx.currentTime, 0.08)
  }

  // ── Silence all voices except the active one ──────────────────────────────
  setActiveVoice(id: string): void {
    if (!this._ready || !this.ctx) return
    const t = this.ctx.currentTime
    if (this.voices.varispeed && id !== "varispeed")
      this.voices.varispeed.gain.gain.setTargetAtTime(0, t, 0.05)
    if (this.voices.genesize && id !== "genesize")
      this.voices.genesize.gain.gain.setTargetAtTime(0, t, 0.05)
    if (this.voices.slide && id !== "slide")
      this.voices.slide.gain.gain.setTargetAtTime(0, t, 0.05)
    if (this.voices.morph && id !== "morph")
      this.voices.morph.gains.forEach(g => g.gain.setTargetAtTime(0, t, 0.05))
    if (this.voices.sos && id !== "sos") {
      this.voices.sos.liveGain.gain.setTargetAtTime(0, t, 0.05)
      this.voices.sos.bufGain.gain.setTargetAtTime(0, t, 0.05)
    }
  }

  destroy(): void {
    this.stopAll()
    void this.ctx?.close()
    this._ready = false
  }
}

// Singleton instance
let _engine: AudioEngine | null = null
export function getAudioEngine(): AudioEngine {
  if (!_engine) _engine = new AudioEngine()
  return _engine
}
