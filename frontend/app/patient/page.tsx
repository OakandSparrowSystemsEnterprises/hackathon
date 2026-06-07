'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getRole, logout } from '@/lib/auth'
import { useChat } from '@/hooks/useChat'
import { AppNav } from '@/components/brand/AppNav'
import { ChatBubble } from '@/components/chat/ChatBubble'
import { ChatComposer } from '@/components/chat/ChatComposer'
import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts'
import { TypingDots } from '@/components/ui/TypingDots'

export default function PatientPage() {
  const router = useRouter()
  const { messages, loading, sendMessage } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!getToken() || getRole() !== 'patient') router.replace('/login')
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <AppNav
        subtitle="Patient Portal"
        actions={[{ label: 'Sign out', onClick: () => { logout(); router.replace('/login') } }]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-soft">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full">
        <SuggestedPrompts onPick={setInput} />
        <ChatComposer onSend={sendMessage} disabled={loading} value={input} onChange={setInput} />
      </div>
    </div>
  )
}
