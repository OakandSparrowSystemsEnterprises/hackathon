import type { AuditRecord } from '@/lib/types'
import { VerdictBadge } from '@/components/ui/VerdictBadge'

export function AuditRecordRow({ rec, index }: { rec: AuditRecord; index: number }) {
  return (
    <div className="card animate-drop-in">
      <div className="px-4 py-3 flex items-start gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-mono w-7 text-right">#{index + 1}</span>
          <VerdictBadge verdict={rec.gate_verdict} />
          {rec.valid ? (
            <span className="text-emerald-600 text-xs font-bold">OK</span>
          ) : (
            <span className="text-red-600 text-xs font-bold">TAMPERED</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5 flex-wrap">
            <span className="text-xs text-slate-500">{new Date(rec.timestamp).toLocaleString()}</span>
            <span className="text-xs text-slate-400 italic">{rec.trigger_reason}</span>
          </div>
          <p className="mono-hash">msg: {rec.message_hash.slice(0, 32)}…</p>
          <p className="font-mono text-xs text-slate-300 truncate">hash: {rec.current_hash.slice(0, 32)}…</p>
        </div>
      </div>
    </div>
  )
}
