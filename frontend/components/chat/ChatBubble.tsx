import type { ChatMessage } from '@/lib/types'
import { VERDICT } from '@/lib/verdict'

export function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isPatient = msg.role === 'patient'
  const surface = isPatient
    ? 'bg-brand-500 text-white rounded-2xl rounded-br-sm'
    : `${msg.verdict ? VERDICT[msg.verdict].bubble : VERDICT.ALLOW.bubble} rounded-2xl rounded-bl-sm`

  return (
    <div className={`flex ${isPatient ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 shadow-sm ${surface}`}>
        {!isPatient && msg.verdict === 'HOLD' && (
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-amber-600">
            ⏳ Pending clinician review
          </p>
        )}
        {!isPatient && msg.verdict === 'BLOCK' && (
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-red-600">
            ⛔ Blocked by safety gate
          </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
      </div>
    </div>
  )
}
