import { Link } from 'react-router-dom'
import { useDemoSpine } from '@/context/DemoSpineContext'
import { useRetailLocale } from '@/context/RetailLocaleContext'

export function SpineNav() {
  const { nextHref } = useDemoSpine()
  const { t } = useRetailLocale()
  const done = nextHref === '/retail'

  return (
    <nav className="spine-nav" aria-label={t('spine.next')}>
      <Link className="btn btn-primary" to={nextHref}>
        {done ? t('spine.done') : t('spine.next')}
      </Link>
    </nav>
  )
}
