'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getRole, logout } from '@/lib/auth'
import { useInbox } from '@/hooks/useInbox'
import { AppNav } from '@/components/brand/AppNav'
import { InboxCard } from '@/components/doctor/InboxCard'
import { Toast } from '@/components/ui/Toast'

export default function DoctorPage() {
  const router = useRouter()
  const { items, edits, setEdit, loading, actioning, toast, loadInbox, handleAction } = useInbox({
    onAuthError: () => router.replace('/login'),
  })

  useEffect(() => {
    if (!getToken() || getRole() !== 'doctor') router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav
        subtitle="Clinician Inbox"
        badge={
          items.length > 0 ? (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {items.length} pending
            </span>
          ) : undefined
        }
        actions={[
          { label: 'Refresh', onClick: loadInbox },
          { label: 'Sign out', onClick: () => { logout(); router.replace('/login') } },
        ]}
      />

      <Toast toast={toast} />

      <div className="max-w-3xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
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
            {items.map((item) => (
              <InboxCard
                key={item.id}
                item={item}
                draft={edits[item.id] ?? item.draft_response}
                onDraftChange={(t) => setEdit(item.id, t)}
                onApprove={() => handleAction(item.id, 'approve')}
                onReject={() => handleAction(item.id, 'reject')}
                busy={actioning === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
