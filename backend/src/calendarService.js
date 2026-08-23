import fetch from 'node-fetch';
import { getState, pushFeed } from './store.js';

// JBlanked's free calendar tier is capped at 1 request/day (see their docs:
// https://www.jblanked.com/news/api/docs/calendar/). That's actually fine
// here — a day's economic releases (Fed, CPI, NFP, etc.) are scheduled in
// advance, so one pull per day is enough. We cache the list and check it
// against the clock locally on every price tick, with no extra API calls.
const warnedIds = new Set();

export async function pollCalendarOnce() {
  const state = getState();
  try {
    const res = await fetch('https://www.jblanked.com/news/api/forex-factory/calendar/today/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${process.env.CALENDAR_API_KEY}`,
      },
    });
    if (!res.ok) {
      console.error(`Calendar fetch failed: ${res.status}`);
      return;
    }
    const events = await res.json();
    const relevant = (Array.isArray(events) ? events : []).filter(
      (e) => ['USD', 'XAU'].includes(e.Currency) && (e.Impact === 'High' || e.Impact === 'Medium')
    );
    state.calendarToday = relevant;
    warnedIds.clear();

    pushFeed({
      type: 'calendar',
      tone: 'neutral',
      text: `Today's watchlist: ${relevant.length} USD/XAU event(s) that can move gold — ${relevant.map((e) => e.Name).join(', ') || 'none scheduled'}.`,
    });
  } catch (err) {
    console.error('Calendar poll failed:', err.message);
  }
}

// Call this on every price tick — pure in-memory check, no network call.
// Warns once when a high/medium impact event is within 15 minutes.
export function checkUpcomingEvents() {
  const state = getState();
  const now = new Date();

  for (const e of state.calendarToday) {
    const key = `${e.Name}-${e.Date}`;
    if (warnedIds.has(key)) continue;

    // OANDA-style "YYYY.MM.DD HH:mm:ss" -> Date
    const eventTime = new Date(e.Date.replace(/\./g, '-').replace(' ', 'T'));
    if (Number.isNaN(eventTime.getTime())) continue;

    const minutesAway = (eventTime - now) / 60000;
    if (minutesAway > 0 && minutesAway <= 15) {
      warnedIds.add(key);
      pushFeed({
        type: 'calendar',
        tone: 'warn',
        text: `⚠️ ${e.Name} (${e.Currency}, ${e.Impact} impact) in ~${Math.round(minutesAway)} min — expect volatility, scalping through this is higher risk.`,
      });
    }
  }
}
