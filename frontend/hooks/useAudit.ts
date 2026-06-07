import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { AuditResponse } from '@/lib/types'

export function useAudit({ pollMs }: { pollMs?: number } = {}) {
  const [audit, setAudit] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refetch = useCallback(async () => {
    try {
      const data = (await apiFetch('/audit')) as AuditResponse
      setAudit(data)
      setError('')
    } catch {
      setError('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (!pollMs) return
    const id = setInterval(refetch, pollMs)
    return () => clearInterval(id)
  }, [pollMs, refetch])

  return { audit, loading, error, refetch }
}
