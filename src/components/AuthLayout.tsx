import type { ReactNode } from 'react'
import { Radar } from 'lucide-react'
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
    <div className="relative flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-sm">
            <Radar size={22} />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
