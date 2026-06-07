interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  withWordmark?: boolean
  subtitle?: string
}

const SIZES = {
  sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-5 h-5', title: 'text-sm' },
  md: { box: 'w-10 h-10 rounded-xl', icon: 'w-6 h-6', title: 'text-lg' },
  lg: { box: 'w-12 h-12 rounded-2xl', icon: 'w-7 h-7', title: 'text-2xl' },
}

/** Shield-check brand mark + optional Sentinel-Med wordmark. */
export function Logo({ size = 'sm', withWordmark = false, subtitle }: LogoProps) {
  const s = SIZES[size]
  return (
    <div className="flex items-center gap-3">
      <div className={`${s.box} bg-brand-500 flex items-center justify-center shadow-sm shrink-0`}>
        <svg className={`${s.icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      {withWordmark && (
        <div className="leading-tight">
          <h1 className={`font-semibold text-slate-900 ${s.title}`}>Sentinel-Med</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
