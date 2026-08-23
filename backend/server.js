import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import { fetchCandles } from './src/priceService.js';
import { computeIndicators } from './src/indicatorEngine.js';
import { evaluateSignal, markTaken } from './src/signalEngine.js';
import { pollCalendarOnce, checkUpcomingEvents } from './src/calendarService.js';
import { pollNews } from './src/newsService.js';
import { getState, winRate } from './src/store.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

const POLL_MS = parseInt(process.env.POLL_INTERVAL_SECONDS || '20', 10) * 1000;
const NEWS_POLL_MS = parseInt(process.env.NEWS_POLL_MINUTES || '15', 10) * 60 * 1000;

// --- Core loop: price -> indicators -> signal engine ---
async function tick() {
  try {
    const candles = await fetchCandles();
    const state = getState();
    state.candles = candles;
    state.price = { time: candles[candles.length - 1]?.time, price: candles[candles.length - 1]?.close };

    const indicators = computeIndicators(candles);
    state.indicators = indicators;

    await evaluateSignal(indicators);
    checkUpcomingEvents();
  } catch (err) {
    console.error('Tick failed:', err.message);
  }
}

// --- Routes ---
app.get('/api/state', (req, res) => {
  const state = getState();
  res.json({
    price: state.price,
    indicators: state.indicators,
    signal: state.signal,
    winRate: winRate(),
  });
});

app.get('/api/feed', (req, res) => {
  const state = getState();
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  res.json(state.feed.slice(0, limit));
});

app.get('/api/history', (req, res) => {
  const state = getState();
  res.json({ winRate: winRate(), history: state.history.slice(0, 100) });
});

app.post('/api/signal/mark-taken', (req, res) => {
  markTaken();
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`XAUUSD monitor backend listening on :${PORT}`);

  // Prime state immediately on boot, then keep polling on a schedule.
  await pollCalendarOnce();
  await pollNews();
  await tick();

  setInterval(tick, POLL_MS);
  setInterval(pollNews, NEWS_POLL_MS);

  // Re-pull the calendar once a day (00:05 UTC) — see calendarService.js for why.
  cron.schedule('5 0 * * *', pollCalendarOnce);
});
