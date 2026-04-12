import { TrackSlider } from "./TrackSlider"
import { Label } from "./atoms"
import type { CVInput, ModSource, ModType, LFOShape, Theme } from "../types"
import { MF } from "../theme"

// ── PSlider ── small labelled slider used inside ModSourcePanel ──────────────
interface PSliderProps {
  label:    string
  value:    number
  min:      number
  max:      number
  step:     number
  unit:     string
  col:      string
  onChange: (v: number) => void
  T:        Theme
}

function PSlider({ label, value, min, max, step, unit, col, onChange, T }: PSliderProps) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: MF, fontSize: 11, color: T.muted }}>{label}</span>
        <span style={{ fontFamily: MF, fontSize: 13, color: col, fontWeight: 500 }}>
          {value.toFixed(2)}{unit}
        </span>
      </div>
      <TrackSlider value={value} min={min} max={max} step={step} onChange={onChange} color={col} T={T} />
    </div>
  )
}

// ── ModSourcePanel ───────────────────────────────────────────────────────────
// Left-panel section: choose modulation type (Static / LFO / ENV / S&H)
// and configure its parameters.

interface ModSourcePanelProps {
  src:          ModSource
  onChange:     (src: ModSource) => void
  inp:          CVInput
  col:          string
  isPlaying:    boolean
  onTogglePlay: () => void
  T:            Theme
}

export function ModSourcePanel({ src, onChange, inp, col, isPlaying, onTogglePlay, T }: ModSourcePanelProps) {
  const set = <K extends keyof ModSource>(k: K, v: ModSource[K]) => onChange({ ...src, [k]: v })

  const typeBtn = (id: ModType) => ({
    background: src.type === id ? col + "22" : T.surface2,
    border: `1px solid ${src.type === id ? col : T.border}`,
    color: src.type === id ? col : T.muted,
    padding: "6px 11px", borderRadius: 2, cursor: "pointer",
    fontFamily: MF, fontSize: 11, letterSpacing: "0.05em",
  })

  const shapeBtn = (id: LFOShape) => ({
    background: src.shape === id ? col + "22" : T.surface2,
    border: `1px solid ${src.shape === id ? col : T.border}`,
    color: src.shape === id ? col : T.muted,
    padding: "5px 10px", borderRadius: 2, cursor: "pointer",
    fontFamily: MF, fontSize: 11,
  })

  const MOD_TYPES: [ModType, string][]   = [["static", "STATIC"], ["lfo", "LFO"], ["envelope", "ENV"], ["sh", "S&H"]]
  const LFO_SHAPES: LFOShape[]           = ["sine", "tri", "saw", "ramp"]

  return (
    <div>
      <Label T={T}>Modulation Source</Label>
      <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
        {MOD_TYPES.map(([t, lbl]) => (
          <button key={t} style={typeBtn(t)} onClick={() => set("type", t)}>{lbl}</button>
        ))}
      </div>

      {/* ── STATIC ── */}
      {src.type === "static" && (<>
        <Label T={T}>CV Value</Label>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: MF, fontSize: 12, color: T.muted }}>{inp.min}V</span>
          <span style={{ fontFamily: MF, fontSize: 13, color: col, fontWeight: 500 }}>
            {(src.staticVal >= 0 && inp.min < 0) ? "+" : ""}{src.staticVal.toFixed(2)} V
          </span>
          <span style={{ fontFamily: MF, fontSize: 12, color: T.muted }}>{inp.max}V</span>
        </div>
        <TrackSlider
          value={src.staticVal} min={inp.min} max={inp.max} step={0.02}
          onChange={v => set("staticVal", v)} color={col} T={T}
        />
      </>)}

      {/* ── LFO ── */}
      {src.type === "lfo" && (<>
        <Label T={T}>Waveform</Label>
        <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
          {LFO_SHAPES.map(s => (
            <button key={s} style={shapeBtn(s)} onClick={() => set("shape", s)}>{s}</button>
          ))}
        </div>
        <PSlider label="RATE" value={src.rate} min={0.05} max={4} step={0.01} unit="Hz"
          col={col} onChange={v => set("rate", v)} T={T} />
        <PSlider label="AMPLITUDE"
          value={+(src.amplitude * (inp.max - inp.min) / 2).toFixed(2)}
          min={0} max={(inp.max - inp.min) / 2} step={0.05} unit="V"
          col={col} onChange={v => set("amplitude", v / Math.max(0.01, (inp.max - inp.min) / 2))} T={T} />
      </>)}

      {/* ── ENVELOPE ── */}
      {src.type === "envelope" && (<>
        <PSlider label="ATTACK" value={src.attackTime} min={0.01} max={20}  step={0.01} unit="s"
          col={col} onChange={v => set("attackTime", v)} T={T} />
        <PSlider label="DECAY"  value={src.decayTime}  min={0.01} max={60}  step={0.05} unit="s"
          col={col} onChange={v => set("decayTime", v)}  T={T} />
        <PSlider label="PEAK CV"
          value={+(inp.min + src.amplitude * (inp.max - inp.min)).toFixed(2)}
          min={inp.min} max={inp.max} step={0.05} unit="V"
          col={col} onChange={v => set("amplitude", (v - inp.min) / Math.max(0.01, inp.max - inp.min))} T={T} />
      </>)}

      {/* ── S&H ── */}
      {src.type === "sh" && (<>
        <PSlider label="CLOCK RATE" value={src.rate} min={0.1} max={8} step={0.05} unit="Hz"
          col={col} onChange={v => set("rate", v)} T={T} />
        <PSlider label="RANGE"
          value={+(src.amplitude * (inp.max - inp.min) + inp.min).toFixed(2)}
          min={inp.min} max={inp.max} step={0.01} unit="V"
          col={col} onChange={v => set("amplitude", (v - inp.min) / Math.max(0.01, inp.max - inp.min))} T={T} />
      </>)}

      {/* ── Play button ── */}
      <div style={{ marginTop: 14 }}>
        <button onClick={onTogglePlay} style={{
          background: isPlaying ? col + "22" : T.surface2,
          border: `1px solid ${isPlaying ? col : T.border}`,
          color: isPlaying ? col : T.muted,
          padding: "9px 16px", borderRadius: 3, cursor: "pointer",
          fontFamily: MF, fontSize: 12, letterSpacing: "0.1em",
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", justifyContent: "center",
        }}>
          {isPlaying ? "■  STOP" : "▶  PLAY MODULATION"}
        </button>
        {src.type !== "static" && !isPlaying && (
          <div style={{
            fontFamily: MF, fontSize: 11, color: T.muted,
            textAlign: "center", marginTop: 7, lineHeight: 1.5,
          }}>
            Press play to animate curves live
          </div>
        )}
      </div>
    </div>
  )
}
