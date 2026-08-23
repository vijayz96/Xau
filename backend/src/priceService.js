import fetch from 'node-fetch';

const BASE_URLS = {
  practice: 'https://api-fxpractice.oanda.com',
  live: 'https://api-fxtrade.oanda.com',
};

// Fetches the latest N candles for XAU_USD from OANDA's practice API.
// A free OANDA "practice" (demo) account gives full read access to this —
// no real money or live account needed. Verify exact behavior against
// https://developer.oanda.com/rest-live-v20/instrument-ep/ if anything here
// doesn't match what you see, since third-party API details do shift over time.
export async function fetchCandles({
  instrument = 'XAU_USD',
  granularity = process.env.CANDLE_GRANULARITY || 'M1',
  count = process.env.CANDLE_COUNT || 210,
} = {}) {
  const base = BASE_URLS[process.env.OANDA_ENV || 'practice'];
  const url = `${base}/v3/instruments/${instrument}/candles?granularity=${granularity}&count=${count}&price=M`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.OANDA_API_TOKEN}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OANDA candles request failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  return data.candles.map((c) => ({
    time: c.time,
    open: parseFloat(c.mid.o),
    high: parseFloat(c.mid.h),
    low: parseFloat(c.mid.l),
    close: parseFloat(c.mid.c),
    complete: c.complete,
  }));
}
