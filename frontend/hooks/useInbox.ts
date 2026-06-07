import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch, ApiError } from '@/lib/api'
import type { InboxItem } from '@/lib/types'
import type { ToastState } from '@/components/ui/Toast'

interface UseInboxOptions {
  /** Token override for /demo (silent doctor login, held in state). */
  token?: string | null
  /** Called on 401/403 — real /doctor page redirects to /login. */
  onAuthError?: () => void
  /** Fired after an approve/reject so sibling panes refresh. */
  onMutate?: () => void
  /** Poll interval in ms (used by /demo). */
  pollMs?: number
}

export function useInbox({ token, onAuthError, onMutate, pollMs }: UseInboxOptions = {}) {
  const [items, setItems] = useState<InboxItem[]>([])
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const ready = token !== null // for /demo: wait until silent login resolves

  const loadInbox = useCallback(async () => {
    if (token === null) return
    try {
      const data = (await apiFetch('/doctor/inbox', token !== undefined ? { token } : {})) as {
        items: InboxItem[]
      }
      setItems(data.items)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) onAuthError?.()
    } finally {
      setLoading(false)
    }
  }, [token, onAuthError])

  useEffect(() => {
    if (!ready) return
    loadInbox()
  }, [ready, loadInbox])

  useEffect(() => {
    if (!pollMs || !ready) return
    const id = setInterval(loadInbox, pollMs)
    return () => clearInterval(id)
  }, [pollMs, ready, loadInbox])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = useCallback(
    async (id: number, action: 'approve' | 'reject') => {
      setActioning(id)
      try {
        await apiFetch(`/doctor/approve/${id}`, {
          method: 'POST',
          body: JSON.stringify({
            action,
            response: action === 'approve' ? edits[id] ?? undefined : undefined,
          }),
          ...(token !== undefined ? { token } : {}),
        })
        showToast(action === 'approve' ? 'Response approved and released' : 'Message rejected', true)
        await loadInbox()
        onMutate?.()
      } catch {
        showToast('Action failed', false)
      } finally {
        setActioning(null)
      }
    },
    [edits, token, loadInbox, onMutate]
  )

  const setEdit = (id: number, text: string) => setEdits((prev) => ({ ...prev, [id]: text }))

  return { items, edits, setEdit, loading, actioning, toast, loadInbox, handleAction }
}
