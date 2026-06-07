'use client'

import { useEffect, useRef, useState } from 'react'
import { useGuidedDemo } from '@/hooks/useGuidedDemo'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { InboxCard } from '@/components/doctor/InboxCard'
import { ChainBanner } from '@/components/audit/ChainBanner'
import { AuditRecordRow } from '@/components/audit/AuditRecordRow'
import { TypingDots } from '@/components/ui/TypingDots'
import { NarrationCaption } from './NarrationCaption'
import { DemoControls } from './DemoControls'

type Focus = 'patient' | 'doctor' | 'audit'

function MiniPane({
  title,
  focus,
  active,
  children,
}: {
  title: string
  focus: Focus
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`card flex flex-col h-72 transition-all duration-500 ${
        active ? 'ring-2 ring-brand-400 scale-[1.02] shadow-float' : 'opacity-60'
      }`}
    >
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-700">{title}</span>
        {active && <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 scroll-soft">{children}</div>
    </div>
  )
}

export function WalkthroughPlayer() {
  const demo = useGuidedDemo()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)

  // Auto-play once when scrolled into view; respect reduced-motion.
  useEffect(() => {
    const el = containerRef.current
    if (!el || hasAutoPlayed) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      demo.goToStep(demo.total - 1)
      setHasAutoPlayed(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          demo.play()
          setHasAutoPlayed(true)
          obs.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasAutoPlayed, demo])

  const { state, step } = demo

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniPane title="Patient" focus="patient" active={step.focus === 'patient'}>
          <div className="space-y-2">
            {state.chat.map((m) => (
              <ChatBubble key={m.id} msg={m} />
            ))}
            {state.typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            {state.chat.length === 0 && !state.typing && (
              <p className="text-xs text-slate-400 text-center pt-8">Waiting for a patient question…</p>
            )}
          </div>
        </MiniPane>

        <MiniPane title="Clinician Inbox" focus="doctor" active={step.focus === 'doctor'}>
          {state.inbox.length === 0 ? (
            <p className="text-xs text-slate-400 text-center pt-8">No items awaiting review</p>
          ) : (
            <div className="space-y-2 pointer-events-none">
              {state.inbox.map((item) => (
                <InboxCard
                  key={item.id}
                  item={item}
                  draft={item.draft_response}
                  onDraftChange={() => {}}
                  onApprove={() => {}}
                  onReject={() => {}}
                  busy={state.approving}
                />
              ))}
            </div>
          )}
        </MiniPane>

        <MiniPane title="Audit Log" focus="audit" active={step.focus === 'audit'}>
          {state.audit.length === 0 ? (
            <p className="text-xs text-slate-400 text-center pt-8">No decisions recorded yet</p>
          ) : (
            <div className="space-y-2">
              <ChainBanner valid length={state.audit.length} />
              {state.audit
                .slice()
                .reverse()
                .map((rec, i) => (
                  <AuditRecordRow key={state.audit.length - 1 - i} rec={rec} index={state.audit.length - 1 - i} />
                ))}
            </div>
          )}
        </MiniPane>
      </div>

      <div className="mt-5 max-w-xl mx-auto">
        <NarrationCaption text={step.caption} stepId={step.id} />
      </div>
      <div className="mt-4">
        <DemoControls
          isPlaying={demo.isPlaying}
          finished={demo.finished}
          stepIndex={demo.stepIndex}
          total={demo.total}
          onPlay={demo.play}
          onPause={demo.pause}
          onRestart={demo.restart}
          onGoToStep={demo.goToStep}
        />
      </div>
    </div>
  )
}
