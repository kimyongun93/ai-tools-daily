'use client';

import { useCallback } from 'react';

interface Props {
  title: string;
  url: string;
  text?: string;
  size?: 'sm' | 'md';
}

export function ShareButton({ title, url, text, size = 'sm' }: Props) {
  const share = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareData = {
      title,
      text: text || `${title} — AI Tools Daily에서 발견한 AI 도구`,
      url: `${window.location.origin}${url}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Web Share API 미지원 시 클립보드 복사
        await navigator.clipboard.writeText(shareData.url);
        showToast('링크가 복사되었습니다');
      }
    } catch (err) {
      // 사용자가 공유 취소한 경우 무시
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(shareData.url);
        showToast('링크가 복사되었습니다');
      }
    }
  }, [title, url, text]);

  const iconSize = size === 'md' ? 22 : 18;

  return (
    <button
      onClick={share}
      className="p-1.5 rounded-lg hover:bg-[var(--surface2)] transition-colors"
      aria-label="공유"
    >
      <svg
        width={iconSize}
        height={iconSize}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
    </button>
  );
}

function showToast(message: string) {
  const existing = document.querySelector('.ai-daily-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'ai-daily-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--text)',
    color: 'var(--bg)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    zIndex: '9999',
    animation: 'fadeInUp 0.3s ease',
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
