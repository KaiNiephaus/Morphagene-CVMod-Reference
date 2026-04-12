import { useState, useEffect, useRef, useCallback } from "react"
import { getAudioEngine } from "../audio/engine"
import { getVSMetrics, getMorphStage, clamp } from "../utils/math"
import type { InputId, FirmOpts } from "../types"

interface AudioEngineResult {
  audioEnabled: boolean
  toggleAudio:  () => Promise<void>
  updateAudio:  (animCV: Record<InputId, number>, firmOpts: FirmOpts & { spliceCount: number }, activeId: InputId) => void
  pauseAudio:   () => void
}

/**
 * useAudioEngine
 *
 * Manages the audio engine lifecycle and exposes:
 *   - audioEnabled  : boolean — has the user enabled audio?
 *   - toggleAudio() : enable / disable audio (must be called from a user gesture)
 *   - updateAudio() : call each frame with current CV values to update the active voice
 *   - pauseAudio()  : silence all voices without disabling audio globally
 */
export function useAudioEngine(): AudioEngineResult {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const engine  = getAudioEngine()
  const prevOrg = useRef(-1)

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

  const pauseAudio = useCallback(() => {
    if (!engine.ready) return
    engine.setActiveVoice("")   // empty string never matches → all silenced
  }, [engine])

  const updateAudio = useCallback((
    animCV:   Record<InputId, number>,
    firmOpts: FirmOpts & { spliceCount: number },
    activeId: InputId,
  ) => {
    if (!engine.ready || !audioEnabled) return
    engine.setActiveVoice(activeId)

    if (activeId === "varispeed") {
      const { speed } = getVSMetrics(animCV.varispeed, firmOpts.vsop)
      engine.setVarispeed(animCV.varispeed, speed)

    } else if (activeId === "genesize") {
      const grainPct = (1 - clamp(animCV.genesize, 0, 8) / 8) * 100
      engine.setGeneSize(animCV.genesize, grainPct)

    } else if (activeId === "slide") {
      const posPct = clamp(animCV.slide, 0, 8) / 8 * 100
      engine.setSlide(animCV.slide, posPct)

    } else if (activeId === "morph") {
      engine.setMorph(animCV.morph, getMorphStage(animCV.morph))

    } else if (activeId === "organize") {
      const spliceIndex = Math.min(
        firmOpts.spliceCount - 1,
        Math.floor((clamp(animCV.organize, 0, 5) / 5) * firmOpts.spliceCount),
      )
      if (spliceIndex !== prevOrg.current) {
        engine.triggerOrganize(spliceIndex)
        prevOrg.current = spliceIndex
      }

    } else if (activeId === "sos") {
      const bufAmt = clamp(animCV.sos, 0, 8) / 8
      engine.setSOS(animCV.sos, 1 - bufAmt, bufAmt)
    }
  }, [audioEnabled, engine])

  useEffect(() => {
    return () => { engine.destroy() }
  }, [engine])

  return { audioEnabled, toggleAudio, updateAudio, pauseAudio }
}
