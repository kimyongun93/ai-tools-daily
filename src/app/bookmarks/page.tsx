'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { ToolCard } from '@/components/ToolCard';
import type { ToolWithCategory } from '@/types';

export default function BookmarksPage() {
  const [tools, setTools] = useState<ToolWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const stored = JSON.parse(localStorage.getItem('ai-daily-bookmarks') || '[]') as string[];

      if (stored.length === 0) {
        setTools([]);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('ai_tools')
        .select('*, category:categories!category_slug(*)')
        .in('id', stored)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      setTools((data || []) as ToolWithCategory[]);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookmarks();

    // 다른 컴포넌트에서 북마크 변경 시 새로고침
    const handler = () => loadBookmarks();
    window.addEventListener('bookmarks-changed', handler);
    return () => window.removeEventListener('bookmarks-changed', handler);
  }, [loadBookmarks]);

  return (
    <div className="pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-1">북마크</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
        저장한 AI 도구 모음
      </p>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border p-4 animate-pulse"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded w-1/3" style={{ backgroundColor: 'var(--surface2)' }} />
                  <div className="h-3 rounded w-2/3" style={{ backgroundColor: 'var(--surface2)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tools.length > 0 ? (
        <div className="grid gap-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16" style={{ color: 'var(--text-dim)' }}>
          <p className="text-4xl mb-3">🔖</p>
          <p className="font-medium">아직 북마크한 도구가 없습니다</p>
          <p className="text-sm mt-1">도구 카드의 북마크 아이콘을 눌러 저장하세요</p>
        </div>
      )}
    </div>
  );
}
