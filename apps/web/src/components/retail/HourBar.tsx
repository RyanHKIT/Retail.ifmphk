import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type HourBarStatus = 'ok' | 'under' | 'warning' | 'exceeded'

export function hourBarStatus(hours: number, min: number, max: number): HourBarStatus {
  if (hours > max) return 'exceeded'
  if (hours >= max * 0.9) return 'warning'
  if (hours < min) return 'under'
  return 'ok'
}

export function HourBar({
  hours,
  min,
  max,
  name,
}: {
  hours: number
  min: number
  max: number
  name: string
}) {
  const pct = max > 0 ? Math.min(hours / max, 1) : 0
  const status = hourBarStatus(hours, min, max)

  return (
    <div className="hour-bar" title={`${name}: ${hours.toFixed(1)}h (${min}–${max})`}>
      <span className="hour-bar__name">{name}</span>
      <div className="hour-bar__track" aria-hidden>
        <div
          className={cn('hour-bar__fill', `hour-bar__fill--${status}`)}
          style={{ '--hour-bar-scale': String(pct) } as CSSProperties}
        />
      </div>
      <span className={cn('hour-bar__hours', status === 'exceeded' && 'hour-bar__hours--hot')}>
        {hours.toFixed(1)}h
      </span>
    </div>
  )
}
