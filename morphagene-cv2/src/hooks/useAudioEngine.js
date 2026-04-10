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

  // Update all voices given current animCV values
  const updateAudio = useCallback((animCV, firmOpts = {}) => {
    if (!engine.ready || !audioEnabled) return

    const vsMetrics = getVSMetrics(animCV.varispeed, firmOpts.vsop || 0)
    engine.setVarispeed(animCV.varispeed, vsMetrics.speed)

    const grainPct = (1 - clamp(animCV.genesize, 0, 8) / 8) * 100
    engine.setGeneSize(animCV.genesize, grainPct)

    const posPct = clamp(animCV.slide, 0, 8) / 8 * 100
    engine.setSlide(animCV.slide, posPct)

    const stage = getMorphStage(animCV.morph)
    engine.setMorph(animCV.morph, stage)

    // Organize: trigger a click when splice selection changes
    const spliceCount  = firmOpts.spliceCount || 8
    const spliceIndex  = Math.min(spliceCount - 1, Math.floor((clamp(animCV.organize, 0, 5) / 5) * spliceCount))
    if (spliceIndex !== prevOrg.current) {
      engine.triggerOrganize(spliceIndex)
      prevOrg.current = spliceIndex
    }

    const bufAmt  = clamp(animCV.sos, 0, 8) / 8
    engine.setSOS(animCV.sos, 1 - bufAmt, bufAmt)
  }, [audioEnabled, engine])

  // Clean up on unmount
  useEffect(() => {
    return () => { engine.destroy() }
  }, [engine])

  return { audioEnabled, toggleAudio, updateAudio }
}
