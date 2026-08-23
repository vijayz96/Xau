import { useEffect, useState } from 'react';

const STATUS_META = {
  IDLE: { label: 'Scanning', color: 'var(--text-faint)' },
  WATCHING: { label: 'Watching', color: 'var(--warn)' },
  ACTIVE: { label: 'Confirmed', color: null }, // resolved from direction below
};

export default function PriceHeader({ price, signal }) {
  const [, forceTick] = useState(0);

  // Re-render every second so the watching countdown stays live even
  // between backend polls.
  useEffect(() => {
    if (signal?.status !== 'WATCHING') return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [signal?.status]);

  const status = signal?.status || 'IDLE';
  const isBuy = signal?.direction === 'BUY';
  const color =
    status === 'ACTIVE' ? (isBuy ? 'var(--buy)' : 'var(--sell)') : STATUS_META[status]?.color || 'var(--text-faint)';

  let progress = 0;
  let sub = 'No majority yet';
  if (status === 'WATCHING' && signal.startedAt) {
    const elapsed = Date.now() - signal.startedAt;
    progress = Math.min(1, elapsed / signal.confirmWindowMs);
    const remaining = Math.max(0, Math.ceil((signal.confirmWindowMs - elapsed) / 1000));
    sub = `${signal.direction} · ${remaining}s to confirm`;
  } else if (status === 'ACTIVE') {
    progress = 1;
    sub = `${signal.direction} · entry ${signal.entry?.toFixed(2)}`;
  }

  return (
    <div className="price-card">
      <div>
        <div className="price-pair">XAU / USD</div>
        <div className="price-main">
          <span className="price-value">{price != null ? price.toFixed(2) : '—'}</span>
        </div>
      </div>

      <div className="status-block">
        <div className="status-text" style={{ textAlign: 'right' }}>
          <span className="status-label" style={{ color }}>
            {status === 'ACTIVE' ? `${signal.direction} confirmed` : STATUS_META[status].label}
          </span>
          <span className="status-sub">{sub}</span>
        </div>
        <div className="status-ring" style={{ '--progress': progress, '--ring-color': color }}>
          <div className="status-dot" style={{ '--dot-color': color }} />
        </div>
      </div>
    </div>
  );
}
