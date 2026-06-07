interface DemoControlsProps {
  isPlaying: boolean
  finished: boolean
  stepIndex: number
  total: number
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onGoToStep: (i: number) => void
}

export function DemoControls({
  isPlaying,
  finished,
  stepIndex,
  total,
  onPlay,
  onPause,
  onRestart,
  onGoToStep,
}: DemoControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={finished ? onRestart : isPlaying ? onPause : onPlay}
        className="inline-flex items-center gap-2 bg-white text-slate-700 hover:text-brand-600 border border-slate-200 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors"
      >
        {finished ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6V4z" /></svg> Replay
          </>
        ) : isPlaying ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" /></svg> Pause
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6V4z" /></svg> Play
          </>
        )}
      </button>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onGoToStep(i)}
            aria-label={`Go to step ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === stepIndex ? 'w-6 bg-brand-500' : i < stepIndex ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-slate-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
