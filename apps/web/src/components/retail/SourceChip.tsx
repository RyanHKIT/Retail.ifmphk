export type SourceChipSource = 'counter' | 'camera' | 'iot'

const LABELS: Record<SourceChipSource, string> = {
  counter: '門禁計數',
  camera: '店內攝像',
  iot: 'IoT',
}

export function SourceChip({ source }: { source: SourceChipSource }) {
  return (
    <span className="source-chip" data-source={source}>
      <span className="source-chip__dot" aria-hidden />
      {LABELS[source]}
    </span>
  )
}
