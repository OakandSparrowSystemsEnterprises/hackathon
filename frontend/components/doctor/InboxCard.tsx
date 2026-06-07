import type { InboxItem } from '@/lib/types'
import { Button } from '@/components/ui/Button'

interface InboxCardProps {
  item: InboxItem
  draft: string
  onDraftChange: (text: string) => void
  onApprove: () => void
  onReject: () => void
  busy?: boolean
}

export function InboxCard({ item, draft, onDraftChange, onApprove, onReject, busy }: InboxCardProps) {
  return (
    <div className="card animate-drop-in">
      <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/70">
        <div className="flex items-center justify-between mb-1.5 gap-3">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            {item.category || item.trigger_reason}
          </span>
          <span className="text-xs text-slate-400 shrink-0">
            {new Date(item.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-slate-800 font-medium">“{item.patient_message}”</p>
      </div>
      <div className="px-5 py-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          AI draft — edit before approving
        </label>
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={4}
          className="input-base w-full text-sm resize-none"
        />
        <div className="flex gap-2 mt-3">
          <Button variant="primary" className="flex-1 bg-emerald-600 hover:bg-emerald-700" loading={busy} onClick={onApprove}>
            Approve &amp; Release
          </Button>
          <Button variant="danger" disabled={busy} onClick={onReject}>
            Reject
          </Button>
        </div>
      </div>
    </div>
  )
}
