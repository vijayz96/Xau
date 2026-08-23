import { getState, pushFeed, recordClosedSignal } from './store.js';
import { getTradeRationale } from './aiSummary.js';

const CONFIRM_WINDOW_MS = parseInt(process.env.CONFIRM_WINDOW_SECONDS || '90', 10) * 1000;
const RR = parseFloat(process.env.RISK_REWARD_RATIO || '1.5');

let confirmTimer = null;

// This is intentionally a MANUAL-ALERT engine: it never places trades. It
// only ever tells you what it sees and lets you decide. Lifecycle:
//   IDLE -> WATCHING (majority just formed, holding for CONFIRM_WINDOW_MS)
//        -> ACTIVE (majority held -> entry/TP/SL published, now tracked)
//        -> IDLE (TP or SL reached, outcome logged for win-rate stats)
export async function evaluateSignal(indicators) {
  if (!indicators) return;
  const state = getState();
  const sig = state.signal;

  if (sig.status === 'ACTIVE') {
    checkOutcome(indicators.price);
    return;
  }

  if (sig.status === 'WATCHING') {
    if (indicators.majority !== sig.direction) {
      pushFeed({ type: 'signal', tone: 'neutral', text: 'Signal invalidated — indicator majority broke before confirmation.' });
      resetSignal();
    }
    return;
  }

  // IDLE: look for a fresh majority to start watching
  if (indicators.majority === 'BUY' || indicators.majority === 'SELL') {
    const agreeCount = indicators.majority === 'BUY' ? indicators.buyCount : indicators.sellCount;

    state.signal = {
      status: 'WATCHING',
      direction: indicators.majority,
      votes: indicators.votes,
      agreeCount,
      startedAt: Date.now(),
      confirmWindowMs: CONFIRM_WINDOW_MS,
    };

    pushFeed({
      type: 'signal',
      tone: indicators.majority === 'BUY' ? 'buy' : 'sell',
      text: `Watching ${indicators.majority} — ${agreeCount}/5 indicators agree (${Object.entries(indicators.votes).filter(([, v]) => v === indicators.majority).map(([k]) => k).join(', ')}). Confirming for ${CONFIRM_WINDOW_MS / 1000}s.`,
    });

    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => confirmIfStillValid(indicators), CONFIRM_WINDOW_MS);
  }
}

async function confirmIfStillValid(indicators) {
  const state = getState();
  const sig = state.signal;
  if (sig.status !== 'WATCHING') return; // already invalidated by a later tick

  const entry = indicators.price;
  const atr = indicators.atr || entry * 0.001; // fallback if ATR isn't ready yet
  const slDist = atr;
  const tpDist = atr * RR;
  const direction = sig.direction;

  const tp = direction === 'BUY' ? entry + tpDist : entry - tpDist;
  const sl = direction === 'BUY' ? entry - slDist : entry + slDist;

  state.signal = {
    status: 'ACTIVE',
    direction,
    entry,
    tp: +tp.toFixed(2),
    sl: +sl.toFixed(2),
    votes: sig.votes,
    confirmedAt: Date.now(),
    taken: false,
  };

  const entry_ = pushFeed({
    type: 'signal',
    tone: direction === 'BUY' ? 'buy' : 'sell',
    text: `${direction} confirmed — Entry ${entry.toFixed(2)} · TP ${tp.toFixed(2)} · SL ${sl.toFixed(2)}`,
    signal: { ...state.signal },
  });

  // Best-effort AI rationale — never let this block or crash the signal itself.
  try {
    const rationale = await getTradeRationale({ direction, entry, tp, sl, votes: sig.votes });
    if (rationale) {
      pushFeed({ type: 'rationale', tone: 'neutral', text: rationale, relatedTo: entry_.id });
    }
  } catch (err) {
    console.error('AI rationale failed:', err.message);
  }
}

function checkOutcome(price) {
  const state = getState();
  const sig = state.signal;
  const hitTp = sig.direction === 'BUY' ? price >= sig.tp : price <= sig.tp;
  const hitSl = sig.direction === 'BUY' ? price <= sig.sl : price >= sig.sl;

  if (hitTp || hitSl) {
    const outcome = hitTp ? 'WIN' : 'LOSS';
    recordClosedSignal({ ...sig, closedAt: Date.now(), closePrice: price, outcome });
    pushFeed({
      type: 'signal',
      tone: outcome === 'WIN' ? 'buy' : 'sell',
      text: `${sig.direction} ${outcome === 'WIN' ? 'hit TP ✅' : 'hit SL ❌'} at ${price.toFixed(2)}`,
    });
    resetSignal();
  }
}

// Called from the "Mark as taken" button in the UI — purely for your own
// win-rate bookkeeping, does not place any trade anywhere.
export function markTaken() {
  const state = getState();
  if (state.signal.status === 'ACTIVE') state.signal.taken = true;
}

function resetSignal() {
  const state = getState();
  state.signal = { status: 'IDLE' };
  clearTimeout(confirmTimer);
  confirmTimer = null;
}
