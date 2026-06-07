import { Logo } from '@/components/brand/Logo'
import { WalkthroughPlayer } from '@/components/demo/WalkthroughPlayer'

const VERDICTS = [
  {
    tag: 'ALLOW',
    color: 'text-emerald-600 bg-emerald-100',
    title: 'Low-risk → answered',
    body: 'Routine, general-health questions are answered instantly by the assistant.',
  },
  {
    tag: 'HOLD',
    color: 'text-amber-600 bg-amber-100',
    title: 'Clinical judgment → held',
    body: 'Anything needing a clinician is paused and routed to a doctor as an editable draft.',
  },
  {
    tag: 'BLOCK',
    color: 'text-red-600 bg-red-100',
    title: 'Unsafe → blocked',
    body: 'Crisis and high-risk requests are refused with safe next steps and resources.',
  },
]

const FEATURES = [
  {
    title: 'Deterministic safety gate',
    body: 'A rules-based gate classifies every message before any model runs. The AI can never decide routing — and a model outage can never ship an unsafe answer.',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Human in the loop',
    body: 'Held questions land in a clinician inbox with an AI draft. The doctor edits, approves, or rejects — nothing reaches the patient unreviewed.',
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z',
  },
  {
    title: 'Tamper-evident audit',
    body: 'Every decision — including the clinician’s — is hashed and chained. Anyone can verify the log, and altering any past record breaks the chain.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" withWordmark subtitle="Human-in-the-Loop Medical AI" />
          <nav className="flex items-center gap-5 text-sm font-medium">
            <a href="/demo" className="text-slate-600 hover:text-brand-600 transition-colors">Live demo</a>
            <a href="/audit-log" className="hidden sm:block text-slate-600 hover:text-brand-600 transition-colors">Audit log</a>
            <a href="/login" className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl transition-colors">
              Sign in
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 to-white" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-16 pb-12 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 bg-brand-100 rounded-full px-3 py-1 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> Safety-gated · clinician-reviewed · auditable
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 max-w-3xl mx-auto">
            A medical chatbot you can actually trust to be safe.
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
            Sentinel-Med puts a deterministic safety gate and a real clinician between the AI and the patient —
            and seals every decision in a tamper-evident hash chain.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/demo" className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-xl shadow-sm transition-colors">
              Try the live demo
            </a>
            <a href="/login" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-6 py-3 rounded-xl transition-colors">
              Sign in as patient or doctor
            </a>
          </div>
        </div>
      </section>

      {/* Guided walkthrough */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Watch the whole loop in action</h2>
          <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
            From patient question, to safety gate, to clinician review, to a tamper-evident record — in about 20 seconds.
          </p>
        </div>
        <WalkthroughPlayer />
      </section>

      {/* Verdicts */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-10">
            Three paths, decided before the AI speaks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {VERDICTS.map((v) => (
              <div key={v.tag} className="card p-6">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${v.color}`}>{v.tag}</span>
                <h3 className="font-semibold text-slate-900">{v.title}</h3>
                <p className="text-sm text-slate-600 mt-1.5">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white">See it for yourself</h2>
          <p className="text-brand-100 mt-2 max-w-xl mx-auto">
            Open the live three-pane demo, or sign in as a patient or clinician.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="/demo" className="bg-white text-brand-700 hover:bg-brand-50 font-medium px-6 py-3 rounded-xl transition-colors">
              Open live demo
            </a>
            <a href="/audit-log" className="text-white border border-white/40 hover:bg-white/10 font-medium px-6 py-3 rounded-xl transition-colors">
              Verify the audit log
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 text-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-slate-300 font-medium">Sentinel-Med</span>
          </div>
          <p className="text-xs">Human-in-the-loop medical AI · every decision hash-chained · demo only, not medical advice.</p>
        </div>
      </footer>
    </div>
  )
}
