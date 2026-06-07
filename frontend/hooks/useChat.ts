import { useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { ChatMessage, ChatApiResponse } from '@/lib/types'

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  text: 'Hello! I can help with general health information. What would you like to know?',
  verdict: 'ALLOW',
}

interface UseChatOptions {
  /** Token override for the /demo patient pane (held in state, not localStorage). */
  token?: string | null
  /** Fired after a message round-trips, so sibling panes can refresh. */
  onMutate?: () => void
}

export function useChat({ token, onMutate }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [loading, setLoading] = useState(false)

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'patient', text: trimmed }])
      setLoading(true)
      try {
        const data = (await apiFetch('/chat', {
          method: 'POST',
          body: JSON.stringify({ message: trimmed }),
          ...(token !== undefined ? { token } : {}),
        })) as ChatApiResponse
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-bot`, role: 'bot', text: data.reply, verdict: data.verdict },
        ])
        onMutate?.()
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-err`, role: 'bot', text: 'Connection error. Please try again.', verdict: 'BLOCK' },
        ])
      } finally {
        setLoading(false)
      }
    },
    [loading, token, onMutate]
  )

  return { messages, loading, sendMessage }
}
