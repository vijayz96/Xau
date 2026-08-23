# XAU·Watch — XAUUSD monitor + confluence signal engine

A live dashboard for gold (XAU/USD): real-time price, a feed of the macro
news/economic-calendar events that actually move gold, and a manual-alert
signal engine that watches five technical indicators and only speaks up when
a majority agree.

**What this is:** decision support. It shows you what's happening and why,
with entry/TP/SL suggestions when its indicators line up.

**What this isn't:** a 90%-accurate prediction machine (nothing is — see the
note in the main chat if you want the full reasoning), and it never places
trades automatically. Every signal ends with *you* deciding.

---

## 1. Get your API keys (all free)

| Service | What it's for | Get a key |
|---|---|---|
| OANDA practice account | Live XAU_USD candles | Sign up at oanda.com/forex-trading, then **My Account → My Services → Manage API Access** to generate a token. No deposit needed, practice accounts are permanently free. |
| JBlanked Calendar API | Fed/CPI/NFP economic calendar | jblanked.com/api/key/ — free tier is capped at **1 request/day**, which is why the backend only pulls it once daily and caches it (a day's releases are scheduled in advance anyway). |
| Marketaux | Gold/USD news headlines + sentiment | marketaux.com — free tier is ~100 requests/day. Default polling (every 15 min) uses about 65-95/day depending on the trading day, so you've got headroom. |
| Anthropic API | AI-written "why" explanations | console.anthropic.com/settings/keys |

## 2. Run the backend

```bash
cd backend
cp .env.example .env    # paste your 4 keys in
npm install
npm start
```

It boots on `:4000`, pulls the calendar and news once, computes indicators
off the last ~210 one-minute candles, and starts polling every 20s.

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the printed `localhost:5173` URL. It polls the backend every 4 seconds.

---

## Running this continuously, not just on your laptop

Locally, monitoring stops the moment you close the terminal. For actual
24/7 coverage:

- **Backend:** deploy to Render, Railway, or Fly.io. Their free tiers tend
  to spin down after inactivity, which defeats "continuous" — a $5-7/mo
  tier that stays always-on is worth it once you trust the signals enough
  to rely on them.
- **Frontend:** any static host (Vercel, Netlify, Cloudflare Pages) works
  fine on a free tier. Point it at your deployed backend URL instead of
  `localhost:4000` (update the proxy in `vite.config.js` or add a small
  `VITE_API_BASE` env var if you host frontend and backend separately).

## Tuning the signal engine

All in `backend/.env`:

- `CONFIRM_WINDOW_SECONDS` (default 90) — how long a majority must hold
  before a signal fires. You picked scalping timeframes, so this defaults
  short; **know that "manual alert" + true 1-minute scalping is an inherent
  mismatch** — by the time you see and act on an alert, price has usually
  moved a few pips. If that bothers you, either widen this window and treat
  signals as fast-intraday (5-15 min) rather than true scalps, or this is
  the natural place to eventually add semi-automated execution.
- `CANDLE_GRANULARITY` (default M1) — OANDA granularity code.
- `RISK_REWARD_RATIO` (default 1.5) — TP distance = ATR × this, SL = ATR × 1.

## Honest limitations

- **No backtesting yet.** The win rate you'll see in the app starts
  accumulating from the moment you first run it — it hasn't been validated
  against historical data before going live. Treat early numbers as noisy.
- **Five indicators voting isn't magic.** It's a real, standard technical
  approach (TradingView's own "Technicals" tab does the same kind of
  aggregation), but confluence reduces false signals, it doesn't eliminate
  them — gold gaps hard on real news, which no indicator sees coming.
- **Not investment advice.** This is a tool you built for yourself; you're
  responsible for any trade you place. Paper-trade it for a while before
  putting real money behind it.

## Ideas for next passes

- Push notifications (service worker + web-push) so you're not tied to the
  tab being open — probably the highest-value next step given scalping
  timeframes.
- Swap the in-memory store for Firebase Firestore so history survives
  restarts/redeploys.
- A backtest mode against OANDA's historical candles before trusting a
  tuning change live.
