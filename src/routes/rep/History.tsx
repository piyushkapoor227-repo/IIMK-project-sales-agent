import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Badge, EmptyState, SectionTitle, Spinner } from '../../components/primitives'
import { useMyVisits } from '../../lib/queries/useVisits'
import { repNav } from './nav'

export function RepHistory() {
  const navigate = useNavigate()
  const { data: visits, isLoading } = useMyVisits()

  return (
    <AppShell nav={repNav}>
      <SectionTitle>Visit history</SectionTitle>
      {isLoading ? (
        <Spinner />
      ) : !visits?.length ? (
        <EmptyState>No visits recorded yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {visits.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => navigate(`/rep/visit/${v.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    {v.outlet?.name ?? 'Outlet'}
                  </span>
                  <span className="block text-xs text-slate-400">{v.visit_date}</span>
                </span>
                <Badge tone={v.status === 'submitted' ? 'green' : 'amber'}>
                  {v.status === 'submitted' ? 'Submitted' : 'Draft'}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
