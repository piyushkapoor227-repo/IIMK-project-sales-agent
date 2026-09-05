import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'

export function NotFound() {
  const { session } = useAuth()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center dark:bg-slate-950">
      <p className="text-4xl font-semibold text-slate-300 dark:text-slate-700">404</p>
      <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        to={session ? '/' : '/login'}
        className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
      >
        {session ? 'Back to home' : 'Go to sign in'}
      </Link>
    </div>
  )
}
