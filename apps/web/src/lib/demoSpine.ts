export type SpineFocus = { gapId?: string; zoneId?: string; zoneName?: string }

const BEATS = [
  '/retail',
  '/retail/footfall',
  '/retail/journey',
  '/retail/service-gap',
  '/retail/roster',
  '/retail/coach',
  '/retail/energy',
] as const

function normalizePath(current: string): string {
  const path = current.split(/[?#]/, 1)[0] ?? current
  if (path.length > 1 && path.endsWith('/')) return path.replace(/\/+$/, '')
  return path
}

export function nextBeatPath(current: string): string {
  const path = normalizePath(current)
  const idx = (BEATS as readonly string[]).indexOf(path)
  if (idx === -1) return '/retail'
  return BEATS[(idx + 1) % BEATS.length]
}

function withQuery(pathname: string, params: Array<[string, string | undefined]>): string {
  const qs = params
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return qs ? `${pathname}?${qs}` : pathname
}

export function gapDeepLink(focus: SpineFocus): { coach: string; roster: string } {
  const zone = focus.zoneId || focus.zoneName
  return {
    coach: withQuery('/retail/coach', [
      ['gap', focus.gapId],
      ['zone', zone],
    ]),
    roster: withQuery('/retail/roster', [['zone', zone]]),
  }
}

export type RosterStation = '樓面' | '試衣' | '收銀'

export function zoneToStation(zone?: string): RosterStation {
  if (zone === '試衣間' || zone === 'fitting_room') return '試衣'
  if (zone === '收銀台' || zone === 'cashier') return '收銀'
  return '樓面'
}
