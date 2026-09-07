import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDemoSpine } from '@/context/DemoSpineContext'
import { useRetailLocale } from '@/context/RetailLocaleContext'

function withDemoQuery(path: string, demo: boolean): string {
  if (!demo) return path
  return path.includes('?') ? `${path}&demo=1` : `${path}?demo=1`
}

export function SpineNav() {
  const { nextHref } = useDemoSpine()
  const { t } = useRetailLocale()
  const [searchParams] = useSearchParams()
  const presenter = searchParams.get('demo') === '1'
  const navRef = useRef<HTMLElement>(null)
  const done = nextHref === '/retail'

  useEffect(() => {
    if (!presenter || !navRef.current) return
    navRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [presenter, nextHref])

  return (
    <nav
      ref={navRef}
      className={`spine-nav${presenter ? ' spine-nav--presenter' : ''}`}
      aria-label={t('spine.next')}
    >
      <Link className="btn btn-primary" to={withDemoQuery(nextHref, presenter)}>
        {done ? t('spine.done') : t('spine.next')}
      </Link>
    </nav>
  )
}
