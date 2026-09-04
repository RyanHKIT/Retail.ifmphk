import type { AlertItem } from '@/api/retail';

export function AlertList({ items }: { items: AlertItem[] }) {
  return (
    <div>
      {items.map((a) => (
        <div key={a.alert_id} className="alert-item">
          <div className={`alert-dot ${a.severity}`} />
          <div style={{ flex: 1 }}>
            <div className="alert-title">{a.title}</div>
            <div className="alert-msg">{a.message}</div>
            <div className="alert-time">{a.timestamp.slice(11, 16)} · {a.zone_id}</div>
          </div>
          {!a.read && (
            <span style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>NEW</span>
          )}
        </div>
      ))}
    </div>
  );
}
