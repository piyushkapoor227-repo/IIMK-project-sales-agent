import { LayoutDashboard, MessageSquareWarning, Users } from 'lucide-react'
import type { NavItem } from '../../components/AppShell'

const MGR = 'Restricted — managers & admins only'

export const managerNav: NavItem[] = [
  { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, note: MGR },
  { to: '/manager/users', label: 'Users', icon: Users, note: MGR },
  { to: '/manager/complaints', label: 'Complaints', icon: MessageSquareWarning },
]
