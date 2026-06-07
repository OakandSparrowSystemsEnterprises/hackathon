import { verdictStyle } from '@/lib/verdict'

export function VerdictBadge({ verdict }: { verdict: string }) {
  const v = verdictStyle(verdict)
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${v.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {verdict}
    </span>
  )
}
