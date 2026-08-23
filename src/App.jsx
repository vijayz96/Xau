import { useEffect, useState, useCallback } from 'react';
import { getState, getFeed, markTaken } from './api.js';
import PriceHeader from './components/PriceHeader.jsx';
import StatsBar from './components/StatsBar.jsx';
import SignalFeed from './components/SignalFeed.jsx';

export default function App() {
  const [state, setState] = useState(null);
  const [feed, setFeed] = useState([]);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [s, f] = await Promise.all([getState(), getFeed(60)]);
      setState(s);
      setFeed(f);
      setError(null);
    } catch (err) {
      setError('Backend unreachable — is the server running on :4000?');
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleMarkTaken = async () => {
    setMarking(true);
    try {
      await markTaken();
      await refresh();
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="app">
      <div className="app-title">
        <h1>XAU<span>·</span>Watch</h1>
        <span className="subtitle">manual-alert mode</span>
      </div>

      {error && <div className="empty-state">{error}</div>}

      <PriceHeader price={state?.price?.price} signal={state?.signal} />
      <StatsBar winRate={state?.winRate} />
      <SignalFeed items={feed} currentSignal={state?.signal} onMarkTaken={handleMarkTaken} marking={marking} />

      <div className="disclaimer">
        Decision-support only — nothing here places trades automatically. Signals fire when a
        majority of five indicators agree and hold through a confirm window; TP/SL are sized off
        ATR, not a guarantee. Win rate reflects this app's own signal history, starting from when
        you first ran it. Paper-trade before risking real capital.
      </div>
    </div>
  );
}
