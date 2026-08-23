// Simple in-memory store for the MVP. Everything resets on server restart.
// If you want history to survive restarts/deploys, swap this for Firebase
// Firestore later — the get/push functions below are the only thing that'd
// need to change.

const state = {
  price: null,            // { time, price }
  candles: [],             // rolling OHLC window used for indicators
  indicators: null,        // latest computed indicator snapshot
  signal: { status: 'IDLE' }, // current signal lifecycle object
  feed: [],                 // chronological chat-style events, newest first
  history: [],               // closed signals, used to compute win rate
  calendarToday: [],          // cached high/medium impact events for today
};

const MAX_FEED = 200;
const MAX_HISTORY = 500;

export function getState() {
  return state;
}

export function pushFeed(item) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: new Date().toISOString(),
    ...item,
  };
  state.feed.unshift(entry);
  if (state.feed.length > MAX_FEED) state.feed.length = MAX_FEED;
  return entry;
}

export function recordClosedSignal(record) {
  state.history.unshift(record);
  if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
}

export function winRate() {
  const decided = state.history.filter((h) => h.outcome === 'WIN' || h.outcome === 'LOSS');
  if (!decided.length) return { wins: 0, losses: 0, total: 0, rate: null };
  const wins = decided.filter((h) => h.outcome === 'WIN').length;
  return {
    wins,
    losses: decided.length - wins,
    total: decided.length,
    rate: +((100 * wins) / decided.length).toFixed(1),
  };
}
