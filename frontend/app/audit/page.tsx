'use client'

import { useAudit } from '@/hooks/useAudit'
import { AppNav } from '@/components/brand/AppNav'
import { ChainBanner } from '@/components/audit/ChainBanner'
import { AuditRecordRow } from '@/components/audit/AuditRecordRow'

export default function AuditPage() {
  const { audit, loading, error } = useAudit({ pollMs: 5000 })

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav subtitle="Public Audit Log" actions={[{ label: 'Sign in', href: '/login' }]} />

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Tamper-evident decision log</h2>
          <p className="text-sm text-slate-500 mt-1">
            Every routing decision is hashed and chained to the previous one. Editing any past record
            breaks every hash after it — so the log can be publicly verified.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : audit ? (
          <>
            <ChainBanner valid={audit.chain_valid} length={audit.length} />
            <div className="space-y-2">
              {audit.records.map((rec, i) => (
                <AuditRecordRow key={i} rec={rec} index={i} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
