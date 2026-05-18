/**
 * stats.js — Lightweight anonymous analytics client.
 *
 * Fires events to /api/stat as fire-and-forget POSTs.
 * Never throws, never blocks the user flow.
 */

export function trackEvent(event, subkey) {
  try {
    fetch('/api/stat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, subkey: subkey || undefined }),
    }).catch(() => {});
  } catch {
    // never throw
  }
}
