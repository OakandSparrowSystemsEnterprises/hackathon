import { ReactNode } from 'react'

interface DemoPaneProps {
  title: string
  subtitle?: string
  live?: boolean
  children: ReactNode
}

/** Titled framed column used in the three-pane /demo layout. */
export function DemoPane({ title, subtitle, live, children }: DemoPaneProps) {
  return (
    <section className="card flex flex-col h-[70vh] lg:h-[calc(100vh-13rem)] min-h-[420px]">
      <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {live && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-pulse-ring" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </header>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  )
}
