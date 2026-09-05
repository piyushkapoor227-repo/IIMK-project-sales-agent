// Lightweight toast notifications. Wrap the app in <ToastProvider>, then call
// useToast() from anywhere. Author: Piyush Kapoor.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  tone: Tone
}

interface ToastApi {
  toast: (message: string, tone?: Tone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

const toneClasses: Record<Tone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  info: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

const toneIcon = { success: CheckCircle2, error: AlertCircle, info: Info }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((message: string, tone: Tone = 'info') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message, tone }])
  }, [])

  const api: ToastApi = {
    toast,
    success: useCallback((m: string) => toast(m, 'success'), [toast]),
    error: useCallback((m: string) => toast(m, 'error'), [toast]),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000)
    return () => clearTimeout(timer)
  }, [onDone])

  const Icon = toneIcon[toast.tone]
  return (
    <div
      role="status"
      onClick={onDone}
      className={`pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toneClasses[toast.tone]}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{toast.message}</span>
    </div>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
