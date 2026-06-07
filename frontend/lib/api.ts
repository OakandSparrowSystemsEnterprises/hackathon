import { getToken } from './auth'

// In prod: BASE="" → calls go to same origin (FastAPI serves /chat, /auth/login, etc.)
// In dev:  NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local
const BASE = process.env.NEXT_PUBLIC_API_URL || ''

/** Error carrying the HTTP status so callers can branch on 401/403/etc. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface ApiFetchOptions extends RequestInit {
  /** Override the bearer token (used by /demo panes that hold a token in state). */
  token?: string | null
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<unknown> {
  const { token: overrideToken, ...rest } = options
  const token = overrideToken !== undefined ? overrideToken : getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((rest.headers as Record<string, string>) || {}),
  }
  const res = await fetch(`${BASE}${path}`, { ...rest, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError((body as { detail?: string }).detail || `HTTP ${res.status}`, res.status)
  }
  return res.json()
}
