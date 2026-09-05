import { LayoutDashboard, MessageSquareWarning, Palette, Store, Users } from 'lucide-react'
import type { NavItem } from '../../components/AppShell'

const MGR = 'Restricted — managers & admins only'
const ADMIN = 'Restricted — admins only'

export const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, note: MGR },
  { to: '/admin/users', label: 'Users', icon: Users, note: MGR },
  { to: '/admin/outlets', label: 'Outlets', icon: Store },
  { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/admin/branding', label: 'Branding', icon: Palette, note: ADMIN },
]
