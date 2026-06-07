export function NarrationCaption({ text, stepId }: { text: string; stepId: string }) {
  return (
    <div
      key={stepId}
      className="animate-fade-in-up bg-slate-900/90 text-white text-sm md:text-base font-medium px-5 py-3 rounded-xl shadow-float text-center"
    >
      {text}
    </div>
  )
}
