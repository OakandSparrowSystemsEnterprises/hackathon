'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getRole, logout } from '../../lib/auth'
import { apiFetch } from '../../lib/api'

interface InboxItem {
  id: number
  patient_message: string
  draft_response: string
  trigger_reason: string
  category: string
  created_at: string
  status: string
}

export default function DoctorPage() {
  const router = useRouter()
  const [items, setItems] = useState<InboxItem[]>([])
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const loadInbox = useCallback(async () => {
    try {
      const data = await apiFetch('/doctor/inbox') as { items: InboxItem[] }
      setItems(data.items)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('401') || msg.includes('403')) router.replace('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!getToken() || getRole() !== 'doctor') { router.replace('/login'); return }
    loadInbox()
  }, [router, loadInbox])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAction(id: number, action: 'approve' | 'reject') {
    setActioning(id)
    try {
      await apiFetch(`/doctor/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          response: action === 'approve' ? (edits[id] ?? undefined) : undefined,
        }),
      })
      showToast(action === 'approve' ? 'Response approved and released' : 'Message rejected', true)
      await loadInbox()
    } catch {
      showToast('Action failed', false)
    } finally {
      setActioning(null)
    }
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
            <p className="text-xs text-slate-500">Clinician Inbox</p>
          </div>
          {items.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {items.length} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadInbox} className="text-sm text-slate-500 hover:text-slate-700">Refresh</button>
          <button onClick={() => { logout(); router.replace('/login') }} className="text-sm text-slate-500 hover:text-slate-700">Sign out</button>
        </div>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">Inbox is clear</p>
            <p className="text-slate-400 text-sm mt-1">No messages pending review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-amber-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      {item.category || item.trigger_reason}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium">"{item.patient_message}"</p>
                </div>
                <div className="px-6 py-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    AI Draft - Edit before approving
                  </label>
                  <textarea
                    value={edits[item.id] ?? item.draft_response}
                    onChange={e => setEdits(prev => ({ ...prev, [item.id]: e.target.value }))}
                    rows={4}
                    className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAction(item.id, 'approve')}
                      disabled={actioning === item.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                    >
                      Approve & Release
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'reject')}
                      disabled={actioning === item.id}
                      className="px-4 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium py-2 rounded-xl transition-colors border border-red-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
