import type { NavItem } from '../../components/AppShell'

const MGR = 'Restricted — managers & admins only'

export const managerNav: NavItem[] = [
  { to: '/manager', label: 'Dashboard', note: MGR },
  { to: '/manager/users', label: 'Users', note: MGR },
  { to: '/manager/complaints', label: 'Complaints' },
]
