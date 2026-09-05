import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-accent-600 text-white hover:bg-accent-700 disabled:bg-accent-600/50 dark:bg-accent-500 dark:hover:bg-accent-600',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  outline:
    'border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800',
}

export function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}
