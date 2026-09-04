import type { KpiItem } from '@/api/retail';
import { SourceChip, type SourceChipSource } from './SourceChip';

export function KpiCard({ kpi, source }: { kpi: KpiItem; source?: SourceChipSource }) {
  const changeClass = kpi.change_direction === 'up' ? 'up' : kpi.change_direction === 'down' ? 'down' : '';
  const displayValue = kpi.format === 'percent' ? kpi.value.toFixed(1) : kpi.value.toLocaleString();

  return (
    <div className="kpi-card chart-enter">
      <div className="kpi-head">
        <div className="kpi-label">{kpi.label}</div>
        {source && <SourceChip source={source} />}
      </div>
      <div>
        <span className="kpi-value">{displayValue}</span>
        <span className="kpi-unit">{kpi.unit}</span>
      </div>
      {kpi.change_pct !== undefined && (
        <div className={`kpi-change ${changeClass}`}>
          {kpi.change_direction === 'up' ? '↑' : '↓'} {Math.abs(kpi.change_pct)}% {kpi.compare_label}
        </div>
      )}
      {kpi.realtime && <div className="kpi-realtime">● 實時更新</div>}
    </div>
  );
}
