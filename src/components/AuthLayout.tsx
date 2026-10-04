import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="fixed right-3 top-3 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-panel border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-control bg-brand text-white">
            AI
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
