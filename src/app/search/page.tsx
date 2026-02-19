'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { ToolCard } from '@/components/ToolCard';
import type { ToolWithCategory } from '@/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ToolWithCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('ai_tools')
        .select('*, category:categories!category_slug(*)')
        .eq('is_published', true)
        .textSearch('fts', query.trim(), { type: 'websearch' })
        .limit(30);
      setResults((data || []) as ToolWithCategory[]);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="pb-20 md:pb-6">
      <h1 className="text-xl font-bold mb-4">검색</h1>

      <div
        className="flex items-center gap-2 rounded-xl border px-4 py-3 mb-6"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="AI 툴 이름 또는 키워드로 검색..."
          className="flex-1 bg-transparent outline-none text-sm"
          autoFocus
        />
      </div>

      {loading && (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-dim)' }}>검색 중...</p>
      )}

      <div className="grid gap-3">
        {results.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {query && !loading && results.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-dim)' }}>
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm">&quot;{query}&quot;에 대한 검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}
