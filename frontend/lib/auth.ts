const TOKEN_KEY = 'sm_token'
const ROLE_KEY = 'sm_role'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ROLE_KEY)
}

export function setAuth(token: string, role: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, role)
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
}
