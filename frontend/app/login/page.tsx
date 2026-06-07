'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAuth } from '@/lib/auth'
import { apiFetch } from '@/lib/api'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = (await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })) as { token: string; role: string }
      setAuth(data.token, data.role)
      router.push(data.role === 'doctor' ? '/doctor' : '/patient')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function fillCredentials(u: string, p: string) {
    setUsername(u)
    setPassword(p)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-slate-900 to-slate-900 p-4">
      <div className="w-full max-w-3xl">
        <a href="/" className="flex flex-col items-center justify-center gap-3 mb-8 text-center">
          <Logo size="lg" />
          <div>
            <h1 className="text-3xl font-bold text-white">Sentinel-Med</h1>
            <p className="text-brand-100/70 text-sm mt-1">Human-in-the-Loop Medical AI</p>
          </div>
        </a>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-float p-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign in</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-base w-full"
                  placeholder="patient or doctor"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base w-full"
                  placeholder="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" size="lg" loading={loading} className="w-full">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>

          <div className="bg-slate-800 rounded-2xl shadow-float p-8 border border-white/5">
            <h2 className="text-xl font-semibold text-white mb-2">Demo credentials</h2>
            <p className="text-slate-400 text-sm mb-5">Click a card to fill the form automatically.</p>
            <div className="space-y-3">
              <button
                onClick={() => fillCredentials('patient', 'patient123')}
                className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wide">Patient</span>
                  <span className="text-slate-400 text-xs group-hover:text-white transition-colors">Click to fill</span>
                </div>
                <p className="text-white font-mono text-sm">patient / patient123</p>
                <p className="text-slate-400 text-xs mt-1">Chat with the medical assistant</p>
              </button>
              <button
                onClick={() => fillCredentials('doctor', 'doctor123')}
                className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-brand-300 font-semibold text-sm uppercase tracking-wide">Doctor</span>
                  <span className="text-slate-400 text-xs group-hover:text-white transition-colors">Click to fill</span>
                </div>
                <p className="text-white font-mono text-sm">doctor / doctor123</p>
                <p className="text-slate-400 text-xs mt-1">Review and approve held messages</p>
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <a href="/audit-log" className="text-slate-400 hover:text-white text-sm transition-colors">
                View audit log →
              </a>
              <a href="/demo" className="text-slate-400 hover:text-white text-sm transition-colors">
                Live demo →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
