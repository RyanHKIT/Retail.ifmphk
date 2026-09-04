import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { KpiCard } from './KpiCard'

test('KPI cards enter with chart-enter', () => {
  const { container } = render(
    <KpiCard kpi={{ id: 'enter', label: '進店', value: 386, unit: '人' }} />,
  )
  expect(container.firstElementChild).toHaveClass('kpi-card')
  expect(container.firstElementChild).toHaveClass('chart-enter')
  expect(screen.getByText('進店')).toBeInTheDocument()
})

test('optional source chip sits on the KPI card', () => {
  render(
    <KpiCard
      kpi={{ id: 'passby', label: '過店人流', value: 1248, unit: '人' }}
      source="counter"
    />,
  )
  const chip = document.querySelector('.kpi-card .source-chip')
  expect(chip).toHaveAttribute('data-source', 'counter')
  expect(chip).toHaveTextContent('門禁計數')
})
