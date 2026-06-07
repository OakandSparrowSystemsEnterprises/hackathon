'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

interface AuditRecord {
  timestamp: string
  gate_verdict: string
  trigger_reason: string
  message_hash: string
  parent_hash: string
  current_hash: string
  valid: boolean
}

interface AuditResponse {
  chain_valid: boolean
  length: number
  records: AuditRecord[]
}

export default function AuditPage() {
  const [audit, setAudit] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/audit')
      .then(data => setAudit(data as AuditResponse))
      .catch(() => setError('Failed to load audit log'))
      .finally(() => setLoading(false))
  }, [])

  function verdictBadge(verdict: string): string {
    if (verdict === 'ALLOW') return 'bg-emerald-100 text-emerald-700'
    if (verdict === 'HOLD') return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-sm">Sentinel-Med</h1>
            <p className="text-xs text-slate-500">Audit Log</p>
          </div>
        </div>
        <a href="/login" className="text-sm text-slate-500 hover:text-slate-700">Sign in</a>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : audit ? (
          <>
            <div className={`rounded-xl px-6 py-4 mb-6 flex items-center gap-3 ${audit.chain_valid ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <span className="text-2xl">{audit.chain_valid ? '✓' : '✗'}</span>
              <div>
                <p className={`font-semibold ${audit.chain_valid ? 'text-emerald-700' : 'text-red-700'}`}>
                  {audit.chain_valid ? 'Chain intact - all records verified' : 'CHAIN BROKEN - tampering detected'}
                </p>
                <p className="text-sm text-slate-500">{audit.length} records in log</p>
              </div>
            </div>
            <div className="space-y-2">
              {audit.records.map((rec, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-4 py-3 flex items-start gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 font-mono w-6 text-right">#{i + 1}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${verdictBadge(rec.gate_verdict)}`}>
                        {rec.gate_verdict}
                      </span>
                      {rec.valid
                        ? <span className="text-emerald-500 text-xs font-bold">OK</span>
                        : <span className="text-red-600 text-xs font-bold">TAMPERED</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="text-xs text-slate-500">{new Date(rec.timestamp).toLocaleString()}</span>
                        <span className="text-xs text-slate-400 italic">{rec.trigger_reason}</span>
                      </div>
                      <p className="font-mono text-xs text-slate-400 truncate">msg: {rec.message_hash.slice(0, 32)}...</p>
                      <p className="font-mono text-xs text-slate-300 truncate">hash: {rec.current_hash.slice(0, 32)}...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
