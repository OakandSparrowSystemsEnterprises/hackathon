import { useState } from 'react'

interface ChatComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  /** Externally-controlled value (e.g. when a suggested prompt is picked). */
  value?: string
  onChange?: (text: string) => void
}

export function ChatComposer({ onSend, disabled, value, onChange }: ChatComposerProps) {
  const [internal, setInternal] = useState('')
  const text = value !== undefined ? value : internal
  const setText = (t: string) => (onChange ? onChange(t) : setInternal(t))

  function submit() {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
  }

  return (
    <div className="bg-white border-t border-slate-200 px-4 py-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Ask a health question…"
          className="input-base flex-1 text-sm"
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl transition-colors disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
