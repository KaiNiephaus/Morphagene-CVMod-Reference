import { useEffect, useRef } from "react"
import { computeModCV } from "../utils/math"
import { INPUTS } from "../data/inputs"
import type { ModSourceMap, InputId, TimeDomainPoint } from "../types"

type RollingBufferRef = React.MutableRefObject<Partial<Record<InputId, TimeDomainPoint[]>>>

/**
 * useRollingBuffer
 *
 * Maintains a rolling history of CV values for every input, updated each
 * animation frame while playing. Resets on stop.
 *
 * Returns a ref — consumers read it during render without triggering extra renders.
 */
export function useRollingBuffer(
  isPlaying:   boolean,
  modSources:  ModSourceMap,
  animTime:    number,
  windowSize = 5,
): RollingBufferRef {
  const bufferRef: RollingBufferRef = useRef({})

  useEffect(() => {
    if (!isPlaying) {
      bufferRef.current = {}
      return
    }

    INPUTS.forEach(inp => {
      const src = modSources[inp.id]
      if (src.type === "static") return

      const buf      = bufferRef.current[inp.id] ?? []
      const newCV    = +computeModCV(src, animTime, inp).toFixed(4)
      const newPoint: TimeDomainPoint = { t: +animTime.toFixed(3), cv: newCV }
      bufferRef.current[inp.id] = [...buf, newPoint].filter(p => p.t >= animTime - windowSize)
    })
  }, [animTime, isPlaying, modSources, windowSize])

  return bufferRef
}
