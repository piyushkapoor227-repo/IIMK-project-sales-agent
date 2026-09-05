import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { Badge, EmptyState, SectionTitle } from '../../components/primitives'
import { Skeleton } from '../../components/Skeleton'
import { useMyVisits } from '../../lib/queries/useVisits'
import { repNav } from './nav'

export function RepHistory() {
  const navigate = useNavigate()
  const { data: visits, isLoading } = useMyVisits()

  return (
    <AppShell nav={repNav}>
      <SectionTitle>Visit history</SectionTitle>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !visits?.length ? (
        <EmptyState>No visits recorded yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {visits.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => navigate(`/rep/visit/${v.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-700 dark:hover:bg-slate-800/50"
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    {v.outlet?.name ?? 'Outlet'}
                  </span>
                  <span className="block text-xs text-slate-400">{v.visit_date}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={v.status === 'submitted' ? 'green' : 'amber'}>
                    {v.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </Badge>
                  <ChevronRight size={16} className="text-slate-400" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
