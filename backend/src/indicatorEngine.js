import { RSI, MACD, EMA, BollingerBands, Stochastic, ATR } from 'technicalindicators';

// Five independent, well-known indicators each cast one vote: BUY, SELL, or
// NEUTRAL. The signal engine only acts when a *majority* (3 of 5) agree —
// this is the "confluence" approach TradingView's own Technicals tab uses,
// not a guarantee, just a way to filter out single-indicator noise.
export function computeIndicators(candles) {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  if (closes.length < 30) return null; // not enough history yet

  const rsi = RSI.calculate({ period: 14, values: closes });
  const macd = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const ema9 = EMA.calculate({ period: 9, values: closes });
  const ema21 = EMA.calculate({ period: 21, values: closes });
  const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
  const stoch = Stochastic.calculate({ high: highs, low: lows, close: closes, period: 14, signalPeriod: 3 });
  const atr = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });

  const price = closes[closes.length - 1];

  // Vote 1: RSI — oversold/overbought
  const rsiVal = rsi[rsi.length - 1];
  const rsiVote = rsiVal < 30 ? 'BUY' : rsiVal > 70 ? 'SELL' : 'NEUTRAL';

  // Vote 2: MACD histogram sign change (momentum cross)
  let macdVote = 'NEUTRAL';
  const m1 = macd[macd.length - 2];
  const m2 = macd[macd.length - 1];
  if (m1 && m2 && m1.MACD != null && m1.signal != null && m2.MACD != null && m2.signal != null) {
    const h1 = m1.MACD - m1.signal;
    const h2 = m2.MACD - m2.signal;
    if (h1 <= 0 && h2 > 0) macdVote = 'BUY';
    if (h1 >= 0 && h2 < 0) macdVote = 'SELL';
  }

  // Vote 3: EMA9/EMA21 cross (trend)
  let emaVote = 'NEUTRAL';
  if (ema9.length >= 2 && ema21.length >= 2) {
    const prevDiff = ema9[ema9.length - 2] - ema21[ema21.length - 2];
    const currDiff = ema9[ema9.length - 1] - ema21[ema21.length - 1];
    if (prevDiff <= 0 && currDiff > 0) emaVote = 'BUY';
    if (prevDiff >= 0 && currDiff < 0) emaVote = 'SELL';
  }

  // Vote 4: Bollinger Band touch (mean reversion)
  let bbVote = 'NEUTRAL';
  const bbLast = bb[bb.length - 1];
  if (bbLast) {
    if (price <= bbLast.lower) bbVote = 'BUY';
    if (price >= bbLast.upper) bbVote = 'SELL';
  }

  // Vote 5: Stochastic %K/%D cross inside an extreme zone
  let stochVote = 'NEUTRAL';
  const s1 = stoch[stoch.length - 2];
  const s2 = stoch[stoch.length - 1];
  if (s1 && s2) {
    if (s1.k <= s1.d && s2.k > s2.d && s2.k < 20) stochVote = 'BUY';
    if (s1.k >= s1.d && s2.k < s2.d && s2.k > 80) stochVote = 'SELL';
  }

  const votes = { rsi: rsiVote, macd: macdVote, ema: emaVote, bollinger: bbVote, stochastic: stochVote };
  const buyCount = Object.values(votes).filter((v) => v === 'BUY').length;
  const sellCount = Object.values(votes).filter((v) => v === 'SELL').length;

  let majority = 'NEUTRAL';
  if (buyCount >= 3 && buyCount > sellCount) majority = 'BUY';
  if (sellCount >= 3 && sellCount > buyCount) majority = 'SELL';

  return {
    price,
    time: candles[candles.length - 1].time,
    rsi: rsiVal,
    atr: atr[atr.length - 1],
    votes,
    buyCount,
    sellCount,
    majority,
  };
}
