import { useEffect, useRef } from "react"
import { computeModCV } from "../utils/math.js"
import { INPUTS } from "../data/inputs.js"

/**
 * useRollingBuffer
 *
 * Maintains a rolling 5-second history of CV values for every input,
 * updated each animation frame while playing. On stop, the buffer resets.
 *
 * Returns a ref (not state) — consumers read it during render without
 * triggering extra renders themselves.
 *
 * @param {boolean} isPlaying
 * @param {object}  modSources  - { [inputId]: ModSource }
 * @param {number}  animTime    - current elapsed time in seconds
 * @param {number}  windowSize  - seconds of history to keep (default 5)
 */
export function useRollingBuffer(isPlaying, modSources, animTime, windowSize = 5) {
  const bufferRef = useRef({})

  useEffect(() => {
    if (!isPlaying) {
      bufferRef.current = {}
      return
    }

    INPUTS.forEach(inp => {
      const src = modSources[inp.id]
      if (src.type === "static") return

      const buf      = bufferRef.current[inp.id] || []
      const newCV    = +computeModCV(src, animTime, inp).toFixed(4)
      const newPoint = { t: +animTime.toFixed(3), cv: newCV }
      const trimmed  = [...buf, newPoint].filter(p => p.t >= animTime - windowSize)
      bufferRef.current[inp.id] = trimmed
    })
  }, [animTime, isPlaying, modSources, windowSize])

  return bufferRef
}
