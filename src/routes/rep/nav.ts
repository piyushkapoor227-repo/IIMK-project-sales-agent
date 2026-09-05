import { CalendarCheck, History } from 'lucide-react'
import type { NavItem } from '../../components/AppShell'

export const repNav: NavItem[] = [
  { to: '/rep', label: 'Today', icon: CalendarCheck },
  { to: '/rep/history', label: 'History', icon: History },
]
