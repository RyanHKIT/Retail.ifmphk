import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { SourceChip } from './SourceChip'

test('maps counter to 門禁計數', () => {
  render(<SourceChip source="counter" />)
  expect(screen.getByText('門禁計數')).toBeInTheDocument()
})

test('maps camera to 店內攝像', () => {
  render(<SourceChip source="camera" />)
  expect(screen.getByText('店內攝像')).toBeInTheDocument()
})

test('maps iot to IoT', () => {
  render(<SourceChip source="iot" />)
  expect(screen.getByText('IoT')).toBeInTheDocument()
})
