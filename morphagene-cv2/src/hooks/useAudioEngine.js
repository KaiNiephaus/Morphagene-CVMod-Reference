import { useState, useEffect, useRef, useCallback } from "react"
import { getAudioEngine } from "../audio/engine.js"
import { getVSMetrics, getMorphStage, clamp } from "../utils/math.js"

/**
 * useAudioEngine
 *
 * Manages the audio engine lifecycle and exposes:
 *   - audioEnabled  : boolean — has the user enabled audio?
 *   - toggleAudio() : function — enable / disable audio
 *   - updateAudio() : function — call with current CV values to update all voices
 *
 * Audio is opt-in (requires a user gesture to start Web Audio context).
 * Call toggleAudio() from a button click.
 */
export function useAudioEngine() {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const engine     = getAudioEngine()
  const prevOrg    = useRef(-1)   // track last organize splice for trigger

  const toggleAudio = useCallback(async () => {
    if (!audioEnabled) {
      await engine.init()
      engine.resume()
      setAudioEnabled(true)
    } else {
      engine.suspend()
      setAudioEnabled(false)
    }
  }, [audioEnabled, engine])

  // Update only the active voice — all others are silenced
  const updateAudio = useCallback((animCV, firmOpts = {}, activeId = "varispeed") => {
    if (!engine.ready || !audioEnabled) return

    engine.setActiveVoice(activeId)

    if (activeId === "varispeed") {
      const vsMetrics = getVSMetrics(animCV.varispeed, firmOpts.vsop || 0)
      engine.setVarispeed(animCV.varispeed, vsMetrics.speed)

    } else if (activeId === "genesize") {
      const grainPct = (1 - clamp(animCV.genesize, 0, 8) / 8) * 100
      engine.setGeneSize(animCV.genesize, grainPct)

    } else if (activeId === "slide") {
      const posPct = clamp(animCV.slide, 0, 8) / 8 * 100
      engine.setSlide(animCV.slide, posPct)

    } else if (activeId === "morph") {
      const stage = getMorphStage(animCV.morph)
      engine.setMorph(animCV.morph, stage)

    } else if (activeId === "organize") {
      const spliceCount = firmOpts.spliceCount || 8
      const spliceIndex = Math.min(spliceCount - 1, Math.floor((clamp(animCV.organize, 0, 5) / 5) * spliceCount))
      if (spliceIndex !== prevOrg.current) {
        engine.triggerOrganize(spliceIndex)
        prevOrg.current = spliceIndex
      }

    } else if (activeId === "sos") {
      const bufAmt = clamp(animCV.sos, 0, 8) / 8
      engine.setSOS(animCV.sos, 1 - bufAmt, bufAmt)
    }
  }, [audioEnabled, engine])

  // Clean up on unmount
  useEffect(() => {
    return () => { engine.destroy() }
  }, [engine])

  return { audioEnabled, toggleAudio, updateAudio }
}
