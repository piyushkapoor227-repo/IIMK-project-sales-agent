// Three-way colour theme switch (System / Light / Dark). Author: Piyush Kapoor.
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '../lib/theme'

const OPTIONS: { value: Theme; Icon: typeof Monitor; label: string }[] = [
  { value: 'system', Icon: Monitor, label: 'System theme' },
  { value: 'light', Icon: Sun, label: 'Light theme' },
  { value: 'dark', Icon: Moon, label: 'Dark theme' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-700"
    >
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            theme === value
              ? 'bg-accent-600 text-white'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}
