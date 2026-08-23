import fetch from 'node-fetch';
import { pushFeed } from './store.js';
import { getMarketContext } from './aiSummary.js';

const seen = new Set();

// Marketaux free tier is roughly 100 requests/day — polling every
// NEWS_POLL_MINUTES (default 15) keeps you well under that with room to
// spare for testing. Docs: https://www.marketaux.com/documentation
export async function pollNews() {
  try {
    const params = new URLSearchParams({
      symbols: 'XAU,XAUUSD',
      filter_entities: 'true',
      language: 'en',
      limit: '10',
      api_token: process.env.MARKETAUX_API_KEY,
    });
    const res = await fetch(`https://api.marketaux.com/v1/news/all?${params.toString()}`);
    if (!res.ok) {
      console.error(`Marketaux fetch failed: ${res.status}`);
      return;
    }
    const data = await res.json();
    const articles = data.data || [];

    const fresh = [];
    for (const a of articles) {
      if (seen.has(a.uuid)) continue;
      seen.add(a.uuid);
      const sentiment = a.entities?.[0]?.sentiment_score;
      const tone = sentiment > 0.15 ? 'buy' : sentiment < -0.15 ? 'sell' : 'neutral';
      pushFeed({
        type: 'news',
        tone,
        text: `📰 ${a.title} (${a.source})`,
        url: a.url,
      });
      fresh.push(a);
    }

    if (fresh.length) {
      try {
        const blurb = await getMarketContext(fresh.map((a) => a.title));
        if (blurb) pushFeed({ type: 'context', tone: 'neutral', text: blurb });
      } catch (err) {
        console.error('AI market context failed:', err.message);
      }
    }
  } catch (err) {
    console.error('News poll failed:', err.message);
  }
}
