const TYPE_LABEL = {
  signal: 'Signal',
  rationale: 'Why',
  news: 'News',
  calendar: 'Calendar',
  context: 'Context',
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SignalFeed({ items, currentSignal, onMarkTaken, marking }) {
  if (!items?.length) {
    return (
      <div className="feed-section">
        <h2>Live feed</h2>
        <div className="empty-state">Waiting on the first price tick and news pull...</div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <h2>Live feed</h2>
      <div className="feed">
        {items.map((item) => {
          const isLiveActiveSignal =
            item.signal &&
            currentSignal?.status === 'ACTIVE' &&
            currentSignal.confirmedAt === item.signal.confirmedAt;

          return (
            <div key={item.id} className={`feed-item tone-${item.tone || 'neutral'}`}>
              <div className="feed-item-top">
                <span className="feed-item-type">{TYPE_LABEL[item.type] || item.type}</span>
                <span className="feed-item-time">{formatTime(item.time)}</span>
              </div>
              <div className="feed-item-text">{item.text}</div>

              {item.signal && (
                <div className="signal-details">
                  <span className="signal-detail"><span className="k">Entry</span>{item.signal.entry?.toFixed(2)}</span>
                  <span className="signal-detail"><span className="k">TP</span>{item.signal.tp?.toFixed(2)}</span>
                  <span className="signal-detail"><span className="k">SL</span>{item.signal.sl?.toFixed(2)}</span>
                </div>
              )}

              {item.signal && (
                <button
                  className="take-btn"
                  disabled={!isLiveActiveSignal || currentSignal?.taken || marking}
                  onClick={onMarkTaken}
                >
                  {currentSignal?.taken && isLiveActiveSignal
                    ? 'Marked as taken'
                    : isLiveActiveSignal
                    ? 'Mark as taken'
                    : 'Trade closed'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
