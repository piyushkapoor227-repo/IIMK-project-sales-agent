import { UserManagement } from '../shared/UserManagement'
import { managerNav } from './nav'

export function ManagerUsers() {
  return <UserManagement nav={managerNav} />
}
