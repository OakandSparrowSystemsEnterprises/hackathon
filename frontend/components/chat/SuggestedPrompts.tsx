import { SAMPLE_PROMPTS } from '@/lib/prompts'

export function SuggestedPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-slate-100 scroll-soft">
      {SAMPLE_PROMPTS.map((p) => (
        <button
          key={p.text}
          onClick={() => onPick(p.text)}
          className="whitespace-nowrap text-xs bg-white border border-slate-200 hover:border-brand-400 text-slate-600 hover:text-brand-600 rounded-full px-3 py-1.5 transition-colors shrink-0"
        >
          {p.text}
        </button>
      ))}
    </div>
  )
}
