// Persistent build attribution — rendered on every screen via AuthLayout / AppShell.
// Author: Piyush Kapoor.

export const BUILD_AUTHOR = 'Piyush Kapoor'

export function Attribution({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`mt-8 border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500 ${className}`}
    >
      Built by <span className="font-medium text-slate-500 dark:text-slate-400">{BUILD_AUTHOR}</span>
    </footer>
  )
}
