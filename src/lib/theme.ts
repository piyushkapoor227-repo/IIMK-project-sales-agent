// Colour theme: system / light / dark. The choice is stored in localStorage and
// always resolved to a concrete `data-theme` attribute on <html> (also set
// pre-paint by an inline script in index.html). Author: Piyush Kapoor.
import { useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'theme'

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = resolve(theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* ignore */
    }
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return { theme, setTheme }
}
