import type { AlertItem } from '@/api/retail';

export function AlertList({ items }: { items: AlertItem[] }) {
  return (
    <div>
      {items.map((a) => (
        <div key={a.alert_id} className="alert-item">
          <div className={`alert-dot ${a.severity}`} />
          <div className="alert-body">
            <div className="alert-title">{a.title}</div>
            <div className="alert-msg">{a.message}</div>
            <div className="alert-time">{a.timestamp.slice(11, 16)} · {a.zone_id}</div>
          </div>
          {!a.read && <span className="alert-unread">新</span>}
        </div>
      ))}
    </div>
  );
}
