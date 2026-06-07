import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { demoScript, INITIAL_STATE, type DemoState, type DemoStep } from '@/lib/demoScript'

export interface GuidedDemo {
  state: DemoState
  step: DemoStep
  stepIndex: number
  total: number
  isPlaying: boolean
  finished: boolean
  play: () => void
  pause: () => void
  restart: () => void
  goToStep: (i: number) => void
}

/**
 * Scripted landing-page walkthrough. State for any step is derived by reducing
 * the step prefix, so scrubbing to any step is trivial and consistent.
 */
export function useGuidedDemo(): GuidedDemo {
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const state = useMemo(
    () => demoScript.slice(0, stepIndex + 1).reduce<DemoState>((s, step) => step.apply(s), INITIAL_STATE),
    [stepIndex]
  )

  useEffect(() => {
    if (!isPlaying) return
    if (stepIndex >= demoScript.length - 1) {
      setIsPlaying(false)
      return
    }
    timer.current = setTimeout(() => setStepIndex((i) => i + 1), demoScript[stepIndex].durationMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isPlaying, stepIndex])

  const play = useCallback(() => {
    setStepIndex((i) => (i >= demoScript.length - 1 ? 0 : i))
    setIsPlaying(true)
  }, [])
  const pause = useCallback(() => setIsPlaying(false), [])
  const restart = useCallback(() => {
    setStepIndex(0)
    setIsPlaying(true)
  }, [])
  const goToStep = useCallback((i: number) => {
    setStepIndex(Math.max(0, Math.min(i, demoScript.length - 1)))
  }, [])

  return {
    state,
    step: demoScript[stepIndex],
    stepIndex,
    total: demoScript.length,
    isPlaying,
    finished: stepIndex >= demoScript.length - 1,
    play,
    pause,
    restart,
    goToStep,
  }
}
