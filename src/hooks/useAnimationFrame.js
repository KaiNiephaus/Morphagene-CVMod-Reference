import { useEffect, useRef, useState } from "react"

/**
 * useAnimationFrame
 * Drives a requestAnimationFrame loop when `isPlaying` is true.
 * Returns the current elapsed time in seconds and a reset function.
 *
 * Usage:
 *   const { animTime, resetTime } = useAnimationFrame(isPlaying)
 */
export function useAnimationFrame(isPlaying) {
  const [animTime, setAnimTime] = useState(0)
  const timeRef  = useRef(0)
  const rafRef   = useRef(null)

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current)
      return
    }
    const loop = () => {
      timeRef.current += 0.016          // ~60fps tick
      setAnimTime(timeRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying])

  const resetTime = () => {
    timeRef.current = 0
    setAnimTime(0)
  }

  return { animTime, resetTime }
}
