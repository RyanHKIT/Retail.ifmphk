import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import type { AlertItem } from '@/api/retail'
import { AlertList } from './AlertList'

const unread: AlertItem = {
  alert_id: 'a1',
  type: 'service_gap',
  severity: 'high',
  title: '試衣間服務缺口',
  message: '等候超過 2 分鐘',
  zone_id: 'fitting_room',
  timestamp: '2026-09-02T14:22:15+08:00',
  read: false,
}

test('unread alerts show 繁中 新, not NEW', () => {
  render(<AlertList items={[unread]} />)
  expect(screen.getByText('新')).toBeInTheDocument()
  expect(screen.queryByText('NEW')).not.toBeInTheDocument()
  expect(document.querySelector('.alert-unread')).toBeTruthy()
})
