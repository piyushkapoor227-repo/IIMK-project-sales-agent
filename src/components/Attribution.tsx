// Persistent build attribution — a fixed badge pinned to the bottom-right of
// every page. Rendered once, globally, from App. Author: Piyush Kapoor.

export const BUILD_AUTHOR = 'Piyush Kapoor'

export function Attribution() {
  return (
    <div
      className="pointer-events-none fixed bottom-2 right-2 z-50 select-none rounded-md bg-white/70 px-2 py-1 text-[11px] leading-none text-slate-400 shadow-sm ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-500 dark:ring-slate-700/70"
      aria-label={`Built by ${BUILD_AUTHOR}`}
    >
      Built by <span className="font-medium text-slate-500 dark:text-slate-400">{BUILD_AUTHOR}</span>
    </div>
  )
}
