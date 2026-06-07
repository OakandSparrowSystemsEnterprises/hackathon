'use client'

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useChat } from '@/hooks/useChat'
import { useInbox } from '@/hooks/useInbox'
import { useAudit } from '@/hooks/useAudit'
import { AppNav } from '@/components/brand/AppNav'
import { DemoPane } from '@/components/demo/DemoPane'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts'
import { TypingDots } from '@/components/ui/TypingDots'
import { InboxCard } from '@/components/doctor/InboxCard'
import { ChainBanner } from '@/components/audit/ChainBanner'
import { AuditRecordRow } from '@/components/audit/AuditRecordRow'

const POLL_MS = 2500

export default function DemoPage() {
  // Silent doctor login — token kept in state only, never localStorage, so it
  // can't collide with a real /doctor session.
  const [doctorToken, setDoctorToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'doctor', password: 'doctor123' }),
      token: null,
    })
      .then((d) => {
        if (!cancelled) setDoctorToken((d as { token: string }).token)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const audit = useAudit({ pollMs: POLL_MS })
  const inbox = useInbox({ token: doctorToken, pollMs: POLL_MS, onMutate: audit.refetch })
  const chat = useChat({
    token: null,
    onMutate: () => {
      inbox.loadInbox()
      audit.refetch()
    },
  })

  const [input, setInput] = useState('')
  const chatBottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.loading])

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav
        subtitle="Interactive Demo"
        actions={[
          { label: 'Sign in', href: '/login' },
          { label: 'Home', href: '/' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">See the whole loop at once</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Send a message as the patient. Risky questions are <span className="text-amber-600 font-medium">held</span>{' '}
            and appear in the clinician inbox. Approve one, and watch the decision get sealed into the public hash chain —
            all three panes are live.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Patient */}
          <DemoPane title="Patient" subtitle="Anyone — no login" live>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-soft bg-slate-50/50">
              {chat.messages.map((m) => (
                <ChatBubble key={m.id} msg={m} />
              ))}
              {chat.loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <SuggestedPrompts onPick={setInput} />
            <ChatComposer onSend={chat.sendMessage} disabled={chat.loading} value={input} onChange={setInput} />
          </DemoPane>

          {/* Doctor */}
          <DemoPane title="Clinician Inbox" subtitle="Held items awaiting review" live>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-soft">
              {!doctorToken ? (
                <div className="text-center py-12 text-slate-400 text-sm">Connecting clinician session…</div>
              ) : inbox.items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Inbox is clear</p>
                  <p className="text-slate-400 text-xs mt-1">Ask the patient a risky question to populate it</p>
                </div>
              ) : (
                inbox.items.map((item) => (
                  <InboxCard
                    key={item.id}
                    item={item}
                    draft={inbox.edits[item.id] ?? item.draft_response}
                    onDraftChange={(t) => inbox.setEdit(item.id, t)}
                    onApprove={() => inbox.handleAction(item.id, 'approve')}
                    onReject={() => inbox.handleAction(item.id, 'reject')}
                    busy={inbox.actioning === item.id}
                  />
                ))
              )}
            </div>
          </DemoPane>

          {/* Audit */}
          <DemoPane title="Audit Log" subtitle="Tamper-evident hash chain" live>
            <div className="flex-1 overflow-y-auto px-3 py-3 scroll-soft">
              {audit.loading ? (
                <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
              ) : audit.audit ? (
                <>
                  <ChainBanner valid={audit.audit.chain_valid} length={audit.audit.length} />
                  <div className="space-y-2">
                    {audit.audit.records
                      .slice()
                      .reverse()
                      .map((rec, i) => (
                        <AuditRecordRow
                          key={audit.audit!.length - 1 - i}
                          rec={rec}
                          index={audit.audit!.length - 1 - i}
                        />
                      ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">No records yet</div>
              )}
            </div>
          </DemoPane>
        </div>
      </div>
    </div>
  )
}
