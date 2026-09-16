// Icons for the pilot-v1 navigation rail.
//
// Deliberately NOT part of `shell/nav.ts`. That file is the shell contract:
// routes and label keys only. A replacement shell should be free to pick its
// own icon set, or none at all, without touching the contract or the routes.

import {
  ArrowLeftRight,
  CalendarDays,
  CalendarRange,
  Cctv,
  Clock,
  DoorOpen,
  IdCard,
  LayoutDashboard,
  Repeat,
  Route,
  Scale,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** Route → icon. Unknown routes fall back to a neutral glyph at render time. */
const ICONS: Record<string, LucideIcon> = {
  '/flow': LayoutDashboard,
  '/flow/journey': Route,
  '/flow/entrances': DoorOpen,
  '/flow/audience': Users,
  '/flow/compare': ArrowLeftRight,
  '/flow/holidays': CalendarDays,

  '/flow/roster': CalendarRange,
  '/flow/roster/staff': IdCard,
  '/flow/roster/templates': Clock,
  '/flow/roster/policies': Scale,
  '/flow/roster/swaps': Repeat,
  '/flow/roster/audit': ScrollText,

  '/flow/devices': Cctv,
  '/flow/settings': Settings,
}

export function navIcon(to: string): LucideIcon | undefined {
  return ICONS[to]
}
