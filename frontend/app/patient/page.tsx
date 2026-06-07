'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getRole, logout } from '../../lib/auth'
import { apiFetch } from '../../lib/api'

interface Message {
  id: string
  role: 'patient' | 'bot'
  text: string
  verdict?: 'ALLOW' | 'HOLD' | 'BLOCK'
}

export default function PatientPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'bot',
    text: 'Hello! I can help with general health information. What would you like to know?',
    verdict: 'ALLOW',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = getToken()
    const role = getRole()
    if (!token || role !== 'patient') {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: Message = { id: Date.now().toString(), role: 'patient', text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const data = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      }) as { verdict: string; reply: string }
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: data.reply,
        verdict: data.verdict as 'ALLOW' | 'HOLD' | 'BLOCK',
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: 'Connection error. Please try again.',
        verdict: 'BLOCK',
      }])
    } finally {
      setLoading(false)
    }
  }

  function bubbleClass(msg: Message): string {
    if (msg.role === 'patient') return 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
    if (msg.verdict === 'HOLD') return 'bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl rounded-bl-sm'
    if (msg.verdict === 'BLOCK') return 'bg-red-50 border border-red-200 text-red-900 rounded-2xl rounded-bl-sm'
    return 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm'
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-sm">Sentinel-Med</h1>
            <p className="text-xs text-slate-500">Patient Portal</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.replace('/login') }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Sign out
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 shadow-sm ${bubbleClass(msg)}`}>
              {msg.verdict === 'HOLD' && (
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-amber-600">Pending clinician review</p>
              )}
              {msg.verdict === 'BLOCK' && (
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-red-600">Blocked</p>
              )}
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-slate-100">
        {[
          'What is a normal blood pressure?',
          'I have chest pain, should I take aspirin?',
          'How do I get more oxycodone?',
        ].map(p => (
          <button
            key={p}
            onClick={() => setInput(p)}
            className="whitespace-nowrap text-xs bg-white border border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-600 rounded-full px-3 py-1.5 transition-colors shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="bg-white border-t border-slate-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask a health question..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
