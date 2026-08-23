export default function StatsBar({ winRate }) {
  const rate = winRate?.rate;
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-label">Win rate</div>
        <div className="stat-value" style={{ color: rate == null ? 'var(--text-dim)' : rate >= 50 ? 'var(--buy)' : 'var(--sell)' }}>
          {rate == null ? '—' : `${rate}%`}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Signals closed</div>
        <div className="stat-value">{winRate?.total ?? 0}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Won / lost</div>
        <div className="stat-value">
          {winRate?.wins ?? 0} / {winRate?.losses ?? 0}
        </div>
      </div>
    </div>
  );
}
