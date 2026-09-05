// App-wide error boundary — keeps a render crash in one screen from blanking
// the whole app. Author: Piyush Kapoor.
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-slate-950">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Something went wrong</h1>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          This screen hit an unexpected error. Reloading usually fixes it.
        </p>
        <pre className="max-w-md overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.assign('/')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        >
          Reload the app
        </button>
      </div>
    )
  }
}
