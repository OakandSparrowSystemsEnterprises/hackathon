import { ReactNode } from 'react'
import { Logo } from './Logo'

export interface NavAction {
  label: string
  href?: string
  onClick?: () => void
}

interface AppNavProps {
  subtitle: string
  badge?: ReactNode
  actions?: NavAction[]
}

/** Shared top header — replaces the per-page inline headers. */
export function AppNav({ subtitle, badge, actions }: AppNavProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
      <a href="/" className="flex items-center gap-3 group">
        <Logo size="sm" withWordmark subtitle={subtitle} />
      </a>
      <div className="flex items-center gap-4">
        {badge}
        <nav className="flex items-center gap-4">
          {actions?.map((a) =>
            a.href ? (
              <a
                key={a.label}
                href={a.href}
                className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
              >
                {a.label}
              </a>
            ) : (
              <button
                key={a.label}
                onClick={a.onClick}
                className="text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
              >
                {a.label}
              </button>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
