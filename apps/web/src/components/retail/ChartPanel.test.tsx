import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ChartPanel } from './ChartPanel'

test('applies chart-enter on the panel', () => {
  const { container } = render(
    <ChartPanel title="進店趨勢">
      <div>chart</div>
    </ChartPanel>,
  )
  const panel = container.firstElementChild
  expect(panel).toHaveClass('card')
  expect(panel).toHaveClass('chart-enter')
  expect(screen.getByText('進店趨勢')).toBeInTheDocument()
  expect(screen.getByText('chart')).toBeInTheDocument()
})

test('KPI stagger index uses enter-stagger token', () => {
  const { container } = render(
    <ChartPanel staggerIndex={2}>
      <div>chart</div>
    </ChartPanel>,
  )
  expect(container.firstElementChild).toHaveStyle({
    animationDelay: 'calc(2 * var(--duration-enter-stagger))',
  })
})
