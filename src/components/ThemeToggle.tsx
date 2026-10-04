import { useTheme, type ThemeMode } from '../lib/theme/ThemeContext'

const OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: '☀️' },
  { mode: 'dark', label: 'Dark', icon: '🌙' },
  { mode: 'system', label: 'System', icon: '💻' },
]

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div className="flex gap-0.5 rounded-control border border-slate-200 bg-white/90 p-0.5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      {OPTIONS.map((opt) => (
        <button
          key={opt.mode}
          onClick={() => setMode(opt.mode)}
          title={opt.label}
          aria-label={`${opt.label} theme`}
          className={`rounded-md px-2 py-1 text-xs ${
            mode === opt.mode
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}
