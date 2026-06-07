import { getToken } from './auth'

const BASE = process.env.NEXT_PUBLIC_API_URL || ''

function apiPath(path: string): string {
  return BASE ? `${BASE}${path}` : `/api${path}`
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }
  const res = await fetch(apiPath(path), { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail || `HTTP ${res.status}`)
  }
  return res.json()
}
