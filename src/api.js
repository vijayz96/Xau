const BASE = '/api';

export async function getState() {
  const res = await fetch(`${BASE}/state`);
  if (!res.ok) throw new Error('Failed to load state');
  return res.json();
}

export async function getFeed(limit = 50) {
  const res = await fetch(`${BASE}/feed?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load feed');
  return res.json();
}

export async function markTaken() {
  const res = await fetch(`${BASE}/signal/mark-taken`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark taken');
  return res.json();
}

// Simple interval-based polling hook-free helper — called from App.jsx.
export function startPolling(callback, ms = 4000) {
  callback();
  const id = setInterval(callback, ms);
  return () => clearInterval(id);
}
