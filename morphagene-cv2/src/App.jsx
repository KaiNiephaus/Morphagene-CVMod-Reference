import { useState, useMemo, useCallback, useEffect, useRef } from "react"
// ── Theme ────────────────────────────────────────────────────────────────────
import { DARK, LIGHT, DARK_COLORS, LIGHT_COLORS } from "./theme.js"

// ── Data ─────────────────────────────────────────────────────────────────────
import { INPUTS, INPUT_MAP } from "./data/inputs.js"

// ── Utils ────────────────────────────────────────────────────────────────────
import { DEFAULT_MOD, computeModCV, buildTimeDomain } from "./utils/math.js"

// ── Hooks ────────────────────────────────────────────────────────────────────
import { useAnimationFrame } from "./hooks/useAnimationFrame.js"
import { useAudioEngine } from "./hooks/useAudioEngine.js"

// ── Components ───────────────────────────────────────────────────────────────
import { Faceplate }         from "./components/Faceplate.jsx"
import { ModSourcePanel }    from "./components/ModSourcePanel.jsx"
import { FirmwarePanel }     from "./components/FirmwarePanel.jsx"
import { ChartPanel }        from "./components/ChartPanel.jsx"
import { InteractionMatrix } from "./components/InteractionMatrix.jsx"
import { AudioToggle }       from "./components/AudioToggle.jsx"
import { Label, Note }       from "./components/atoms.jsx"
import { TrackSlider }       from "./components/TrackSlider.jsx"

const MF = "'DM Mono','Fira Code',monospace"

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(true)
  const T        = isDark ? DARK : LIGHT
  const getColor = useCallback(id => (isDark ? DARK_COLORS : LIGHT_COLORS)[id], [isDark])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState("varispeed")
  const [view, setView]         = useState("charts")   // "charts" | "matrix"
  const [leftTab, setLeftTab]   = useState("mod")      // "mod" | "firmware" | "splices"

  // ── Per-input state ────────────────────────────────────────────────────────
  const [spliceCount, setSpliceCount] = useState(8)
  const [modSources, setModSources]   = useState(
    Object.fromEntries(INPUTS.map(i => [i.id, { ...DEFAULT_MOD, staticVal: i.defaultCv }]))
  )
  const [firmOpts, setFirmOpts] = useState({ vsop: 0, gnsm: 0, ckop: 0, omod: 0, inop: 0 })

  // ── Playback ───────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)
  const { animTime, resetTime }   = useAnimationFrame(isPlaying)
  const rollingBuffer = useRef({})

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) { resetTime() }
    setIsPlaying(p => !p)
  }, [isPlaying, resetTime])

  // ── Audio engine ───────────────────────────────────────────────────────────
  const { audioEnabled, toggleAudio, updateAudio } = useAudioEngine()

  // ── Computed CV values (live during animation, static otherwise) ───────────
  const animCV = useMemo(() => {
    const out = {}
    INPUTS.forEach(i => {
      const src = modSources[i.id]
      out[i.id] = src.type === "static"
        ? src.staticVal
        : isPlaying
          ? computeModCV(src, animTime, i)
          : src.type === "sh"
            ? computeModCV(src, 0.001, i)   // give S&H a non-zero seed when stopped
            : computeModCV(src, 0, i)
    })
    return out
  }, [modSources, animTime, isPlaying])

  // Drive audio engine every frame when playing
  useEffect(() => {
    if (isPlaying && audioEnabled) {
      updateAudio(animCV, { ...firmOpts, spliceCount })
    }
  }, [animCV, isPlaying, audioEnabled, updateAudio, firmOpts, spliceCount])

  // ── Time domain preview data ───────────────────────────────────────────────
  const inp = INPUT_MAP[activeId]
  const col = getColor(activeId)

  // Rolling buffer — 5 second window, updated every frame when playing
  const WINDOW    = 5
  const BUFFER_LEN = 200

  const timeDomain = useMemo(() => {
    const src = modSources[activeId]
    if (src.type === "static") return []

    if (!isPlaying) {
      // Static preview before play is pressed
      return buildTimeDomain(src, inp, WINDOW, BUFFER_LEN)
    }

    // Build rolling window: last 5 seconds of history
    const buf = rollingBuffer.current[activeId] || []
    return buf
  }, [modSources, activeId, inp, isPlaying, animTime])

  // Update rolling buffer every frame
  useEffect(() => {
    if (!isPlaying) {
      rollingBuffer.current = {}
      return
    }
    INPUTS.forEach(i => {
      const src = modSources[i.id]
      if (src.type === "static") return

      const buf     = rollingBuffer.current[i.id] || []
      const newCV   = +computeModCV(src, animTime, i).toFixed(4)
      const newPoint = { t: +animTime.toFixed(3), cv: newCV }

      // Keep only last WINDOW seconds
      const trimmed = [...buf, newPoint].filter(p => p.t >= animTime - WINDOW)
      rollingBuffer.current[i.id] = trimmed
    })
  }, [animTime, isPlaying, modSources])

  const setModSource = useCallback((id, v) => setModSources(p => ({ ...p, [id]: v })), [])

  // ── Button style helpers ───────────────────────────────────────────────────
  const navBtn = id => ({
    background: view === id ? T.surface2 : "none",
    border: `1px solid ${view === id ? T.border2 : T.border}`,
    color: view === id ? T.text : T.muted,
    padding: "5px 13px", cursor: "pointer", borderRadius: 3,
    fontFamily: MF, fontSize: 11, letterSpacing: "0.08em",
  })

  const leftTabBtn = id => ({
    background: "none", border: "none",
    borderBottom: `2px solid ${leftTab === id ? col : "transparent"}`,
    color: leftTab === id ? col : T.muted,
    padding: "8px 12px", cursor: "pointer",
    fontFamily: MF, fontSize: 11, letterSpacing: "0.1em",
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        background: T.panel, borderBottom: `1px solid ${T.border}`,
        padding: "12px 20px", display: "flex", alignItems: "center", gap: 16,
        flexShrink: 0, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", color: T.text }}>
            MAKE NOISE MORPHAGENE
          </div>
          <div style={{ fontFamily: MF, fontSize: 10, color: T.muted, letterSpacing: "0.15em", marginTop: 1 }}>
            CV MODULATION REFERENCE · v3.0
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <AudioToggle audioEnabled={audioEnabled} onToggle={toggleAudio} T={T} />
          <button style={navBtn("charts")} onClick={() => setView("charts")}>INPUTS</button>
          <button style={navBtn("matrix")} onClick={() => setView("matrix")}>MATRIX</button>
          <button onClick={() => setIsDark(p => !p)} style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            color: T.muted, padding: "5px 12px", cursor: "pointer", borderRadius: 3,
            fontFamily: MF, fontSize: 11,
          }}>
            {isDark ? "☀ LIGHT" : "☾ DARK"}
          </button>
        </div>
      </div>

      {/* ── Matrix view ── */}
      {view === "matrix" ? (
        <div style={{ padding: "20px 24px", maxWidth: 740, overflowY: "auto" }}>
          <InteractionMatrix
            onSelectPair={a => { setActiveId(a); setView("charts") }}
            getColor={getColor} T={T}
          />
        </div>
      ) : (

        /* ── Charts view ── */
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

          {/* ── Left panel ── */}
          <div style={{
            width: 250, minWidth: 220, borderRight: `1px solid ${T.border}`,
            display: "flex", flexDirection: "column", background: T.panel,
            overflowY: "auto", flexShrink: 0,
          }}>
            {/* Faceplate */}
            <div style={{ padding: "12px 14px 0", borderBottom: `1px solid ${T.border}` }}>
              <Faceplate activeId={activeId} onSelect={setActiveId} animCV={animCV} getColor={getColor} T={T} />
            </div>

            {/* Left tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <button style={leftTabBtn("mod")}      onClick={() => setLeftTab("mod")}>MOD</button>
              <button style={leftTabBtn("firmware")} onClick={() => setLeftTab("firmware")}>FIRMWARE</button>
              {activeId === "organize" && (
                <button style={leftTabBtn("splices")} onClick={() => setLeftTab("splices")}>SPLICES</button>
              )}
            </div>

            {/* Left tab content */}
            <div style={{ padding: "14px 14px 24px", flex: 1, overflowY: "auto" }}>
              {leftTab === "mod" && (
                <ModSourcePanel
                  src={modSources[activeId]}
                  onChange={v => setModSource(activeId, v)}
                  inp={inp} col={col}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  T={T}
                />
              )}
              {leftTab === "firmware" && (
                <FirmwarePanel
                  inp={inp} firmOpts={firmOpts}
                  setFirmOpts={setFirmOpts} col={col} T={T}
                />
              )}
              {leftTab === "splices" && activeId === "organize" && (
                <div>
                  <Label T={T}>Splice Count</Label>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontFamily: MF, fontSize: 12, color: T.muted }}>2</span>
                    <span style={{ fontFamily: MF, fontSize: 14, color: col, fontWeight: 500 }}>{spliceCount}</span>
                    <span style={{ fontFamily: MF, fontSize: 12, color: T.muted }}>32</span>
                  </div>
                  <TrackSlider value={spliceCount} min={2} max={32} step={1} onChange={setSpliceCount} color={col} T={T} />
                  <Note T={T}>Adjust to see how V-per-splice resolution changes. At 32 splices each occupies only 0.156V — making precise CV selection very difficult without quantisation.</Note>
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", minWidth: 0 }}>
            {/* Input tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 16, overflowX: "auto" }}>
              {INPUTS.map(i => (
                <button key={i.id} onClick={() => setActiveId(i.id)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "8px 16px", whiteSpace: "nowrap",
                  fontFamily: MF, fontSize: 11, letterSpacing: "0.08em",
                  color: activeId === i.id ? getColor(i.id) : T.muted,
                  borderBottom: `2px solid ${activeId === i.id ? getColor(i.id) : "transparent"}`,
                  marginBottom: -1,
                }}>
                  {i.label}
                </button>
              ))}
            </div>

            <ChartPanel
              inp={inp}
              currentCV={animCV[activeId]}
              timeDomain={timeDomain}
              animTime={animTime}
              isPlaying={isPlaying}
              firmOpts={firmOpts}
              T={T} col={col}
              spliceCount={spliceCount}
              modSrc={modSources[activeId]}
            />
          </div>
        </div>
      )}
    </div>
  )
}
