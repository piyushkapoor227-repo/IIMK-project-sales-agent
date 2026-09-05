import type { NavItem } from '../../components/AppShell'

const MGR = 'Restricted — managers & admins only'
const ADMIN = 'Restricted — admins only'

export const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', note: MGR },
  { to: '/admin/users', label: 'Users', note: MGR },
  { to: '/admin/outlets', label: 'Outlets' },
  { to: '/admin/complaints', label: 'Complaints' },
  { to: '/admin/branding', label: 'Branding', note: ADMIN },
]
