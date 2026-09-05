import { TeamDashboard } from '../shared/TeamDashboard'
import { managerNav } from './nav'

export function ManagerDashboard() {
  return <TeamDashboard nav={managerNav} />
}
