export interface ToastState {
  msg: string
  ok: boolean
}

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null
  return (
    <div
      className={`fixed top-4 right-4 px-4 py-3 rounded-xl shadow-float text-sm font-medium z-50 animate-fade-in-up ${
        toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {toast.msg}
    </div>
  )
}
