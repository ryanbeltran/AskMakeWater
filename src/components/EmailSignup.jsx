import { useState } from 'react';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl border border-green-200 p-4 text-center">
        <p className="text-sm text-green-700 font-medium">You're on the list. We'll email you when we add new data sources.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'sending' || !email.trim()}
          className="px-4 py-2.5 bg-mw-water/10 text-mw-water border border-mw-water/30 rounded-xl text-sm font-medium hover:bg-mw-water hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
        >
          {status === 'sending' ? 'Joining...' : 'Get updates'}
        </button>
      </form>
      <p className="text-[10px] text-gray-400 mt-1.5 text-center">
        We'll email you when we add new data sources. No spam, unsubscribe anytime.
      </p>
      {status === 'error' && <p className="text-xs text-red-500 mt-1 text-center">{errorMsg}</p>}
    </div>
  );
}
