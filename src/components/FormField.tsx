import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function FormField({ label, id, className = '', ...rest }: FormFieldProps) {
  return (
    <div className="text-left">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-ring dark:border-slate-600 dark:bg-slate-800 dark:text-white ${className}`}
        {...rest}
      />
    </div>
  )
}
