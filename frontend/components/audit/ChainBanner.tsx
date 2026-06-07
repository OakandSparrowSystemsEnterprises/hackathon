export function ChainBanner({ valid, length }: { valid: boolean; length: number }) {
  return (
    <div
      className={`rounded-2xl px-6 py-4 mb-6 flex items-center gap-4 border ${
        valid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xl shrink-0 ${
          valid ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      >
        {valid ? '✓' : '✗'}
      </span>
      <div>
        <p className={`font-semibold ${valid ? 'text-emerald-700' : 'text-red-700'}`}>
          {valid ? 'Chain intact — every record verified' : 'CHAIN BROKEN — tampering detected'}
        </p>
        <p className="text-sm text-slate-500">{length} decisions sealed in the hash chain</p>
      </div>
    </div>
  )
}
