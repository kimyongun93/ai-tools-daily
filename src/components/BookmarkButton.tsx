'use client';

import { useState, useEffect, useCallback } from 'react';

interface Props {
  toolId: string;
  size?: 'sm' | 'md';
}

/** 로컬 스토리지 기반 북마크 (로그인 없이 동작, Supabase 연동은 로그인 후) */
export function BookmarkButton({ toolId, size = 'sm' }: Props) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const stored = getBookmarks();
    setBookmarked(stored.includes(toolId));
  }, [toolId]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const stored = getBookmarks();
    let next: string[];

    if (stored.includes(toolId)) {
      next = stored.filter((id) => id !== toolId);
    } else {
      next = [...stored, toolId];
    }

    localStorage.setItem('ai-daily-bookmarks', JSON.stringify(next));
    setBookmarked(next.includes(toolId));

    // 다른 탭/컴포넌트에 변경 알림
    window.dispatchEvent(new CustomEvent('bookmarks-changed'));
  }, [toolId]);

  const iconSize = size === 'md' ? 22 : 18;

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-lg hover:bg-[var(--surface2)] transition-colors"
      aria-label={bookmarked ? '북마크 해제' : '북마크 추가'}
    >
      <svg
        width={iconSize}
        height={iconSize}
        fill={bookmarked ? 'var(--accent)' : 'none'}
        stroke={bookmarked ? 'var(--accent)' : 'currentColor'}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    </button>
  );
}

function getBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem('ai-daily-bookmarks') || '[]');
  } catch {
    return [];
  }
}
