import { TeamDashboard } from '../shared/TeamDashboard'
import { adminNav } from './nav'

export function AdminDashboard() {
  return <TeamDashboard nav={adminNav} />
}
