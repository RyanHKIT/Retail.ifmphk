// Navigation contract shared by every flow shell. Shells render this list;
// replacing `pilot-v1` must not require touching routes or label keys.

export type FlowNavItem = {
  to: string
  labelKey: string
  end?: boolean
}

export type FlowNavGroup = {
  groupKey: string
  items: FlowNavItem[]
}

export const FLOW_NAV: FlowNavGroup[] = [
  {
    groupKey: 'nav.overview',
    items: [
      { to: '/flow', labelKey: 'nav.overview', end: true },
      { to: '/flow/journey', labelKey: 'nav.journey' },
      { to: '/flow/entrances', labelKey: 'nav.entrances' },
      { to: '/flow/audience', labelKey: 'nav.audience' },
      { to: '/flow/compare', labelKey: 'nav.compare' },
      { to: '/flow/holidays', labelKey: 'nav.holidays' },
    ],
  },
  {
    groupKey: 'nav.roster',
    items: [
      // `end` keeps this from prefix-matching every roster sub-page, which
      // would leave 排班 highlighted alongside the page actually open.
      { to: '/flow/roster', labelKey: 'nav.roster', end: true },
      { to: '/flow/roster/staff', labelKey: 'nav.rosterStaff' },
      { to: '/flow/roster/templates', labelKey: 'nav.rosterTemplates' },
      { to: '/flow/roster/policies', labelKey: 'nav.rosterPolicies' },
      { to: '/flow/roster/swaps', labelKey: 'nav.rosterSwaps' },
      { to: '/flow/roster/audit', labelKey: 'nav.rosterAudit' },
    ],
  },
  {
    groupKey: 'nav.settings',
    items: [
      { to: '/flow/devices', labelKey: 'nav.devices' },
      { to: '/flow/settings', labelKey: 'nav.settings' },
    ],
  },
]
