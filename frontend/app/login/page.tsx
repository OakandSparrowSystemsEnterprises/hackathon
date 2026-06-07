'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAuth } from '../../lib/auth'
import { apiFetch } from '../../lib/api'

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
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }) as { token: string; role: string }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Sentinel-Med</h1>
          </div>
          <p className="text-slate-400 text-sm">Human-in-the-Loop Medical Chatbot</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign In</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
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
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="bg-slate-700 rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-semibold text-white mb-2">Demo Credentials</h2>
            <p className="text-slate-400 text-sm mb-5">Click to fill automatically</p>
            <div className="space-y-3">
              <button
                onClick={() => fillCredentials('patient', 'patient123')}
                className="w-full text-left bg-slate-600 hover:bg-slate-500 rounded-xl p-4 transition-colors group"
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
                className="w-full text-left bg-slate-600 hover:bg-slate-500 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-400 font-semibold text-sm uppercase tracking-wide">Doctor</span>
                  <span className="text-slate-400 text-xs group-hover:text-white transition-colors">Click to fill</span>
                </div>
                <p className="text-white font-mono text-sm">doctor / doctor123</p>
                <p className="text-slate-400 text-xs mt-1">Review and approve held messages</p>
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-600">
              <a href="/audit" className="text-slate-400 hover:text-white text-sm transition-colors">
                View audit log (public)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
