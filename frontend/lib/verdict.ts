// Single source of truth for verdict presentation, shared by the chat bubble,
// the verdict badge, audit rows, and the scripted demo. Backend returns
// "ALLOW" | "HOLD" | "BLOCK" from the deterministic gate.

export type Verdict = 'ALLOW' | 'HOLD' | 'BLOCK'

export interface VerdictStyle {
  /** Short human label for badges / captions. */
  label: string
  /** Pill (badge) classes. */
  pill: string
  /** Small status dot color. */
  dot: string
  /** Chat bubble surface classes (bot side). */
  bubble: string
  /** Inline accent text color. */
  text: string
}

export const VERDICT: Record<Verdict, VerdictStyle> = {
  ALLOW: {
    label: 'Allowed',
    pill: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    bubble: 'bg-white border border-slate-200 text-slate-800',
    text: 'text-emerald-600',
  },
  HOLD: {
    label: 'Held for review',
    pill: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    bubble: 'bg-amber-50 border border-amber-200 text-amber-900',
    text: 'text-amber-600',
  },
  BLOCK: {
    label: 'Blocked',
    pill: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    bubble: 'bg-red-50 border border-red-200 text-red-900',
    text: 'text-red-600',
  },
}

export function verdictStyle(v: string): VerdictStyle {
  return VERDICT[(v as Verdict)] ?? VERDICT.BLOCK
}
