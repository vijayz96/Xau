import fetch from 'node-fetch';

// Uses Claude Haiku — fast and cheap, which matters since this can fire
// every ~15 min (news context) plus whenever a signal confirms. Swap to
// claude-sonnet-5 in both spots below if you want deeper analysis and don't
// mind the extra cost per call.
const MODEL = 'claude-haiku-4-5-20251001';

async function callClaude(system, user, maxTokens = 200) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claude API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.content?.find((b) => b.type === 'text')?.text?.trim() || null;
}

// Short "what's moving gold right now" blurb from a batch of fresh headlines.
export async function getMarketContext(headlines) {
  if (!headlines?.length) return null;
  return callClaude(
    'You summarize how breaking headlines might affect the XAUUSD (gold/USD) price. ' +
      'Write 1-2 plain sentences, no preamble. Be balanced: say clearly if the ' +
      'likely effect is unclear or mixed rather than forcing a bullish/bearish take.',
    `Headlines:\n${headlines.map((h) => `- ${h}`).join('\n')}`,
    150
  );
}

// Rationale for why a specific confirmed signal fired, given the indicator
// votes that triggered it. This is decision *support*, not a guarantee —
// keep the model honest about that in its own phrasing.
export async function getTradeRationale({ direction, entry, tp, sl, votes }) {
  const voteStr = Object.entries(votes).map(([k, v]) => `${k}: ${v}`).join(', ');
  return callClaude(
    'You explain in plain language why a technical-indicator confluence system ' +
      'flagged a trade setup. 2-3 sentences max. Do not claim certainty or a ' +
      'specific accuracy figure — this is one read of current conditions, not a guarantee.',
    `Direction: ${direction}\nEntry: ${entry}\nTP: ${tp}\nSL: ${sl}\nIndicator votes: ${voteStr}`,
    150
  );
}
