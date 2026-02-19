'use client';

import { useState, useEffect } from 'react';
import { subscribeToPush, unsubscribeFromPush, getCurrentSubscription } from '@/lib/push';

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setSupported(true);
        const sub = await getCurrentSubscription();
        setSubscribed(!!sub);
      }
    };
    check();
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
      }
    } catch (err) {
      console.error('Push toggle error:', err);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        backgroundColor: subscribed ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--surface)',
        color: subscribed ? 'var(--accent)' : 'var(--text-dim)',
      }}
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {loading ? '처리 중...' : subscribed ? '알림 ON' : '알림 받기'}
    </button>
  );
}
