import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '카테고리',
  description: 'AI 도구를 카테고리별로 탐색하세요',
};

export const revalidate = 600;

async function getCategories() {
  const supabase = createServerSupabaseClient();

  // 카테고리별 도구 수 집계
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (!categories) return [];

  // 각 카테고리별 도구 수 조회
  const results = await Promise.all(
    categories.map(async (cat) => {
      const { count } = await supabase
        .from('tools')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
        .eq('is_published', true);
      return { ...cat, tool_count: count || 0 };
    })
  );

  return results;
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-1">카테고리</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
        관심 분야별로 AI 도구를 탐색하세요
      </p>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="rounded-xl border p-4 transition-all hover:shadow-md hover:border-[var(--accent)]"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
          >
            <div className="text-2xl mb-2">{cat.icon}</div>
            <h3 className="font-semibold text-sm mb-0.5">{cat.name}</h3>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {cat.tool_count}개 도구
            </p>
          </a>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-dim)' }}>
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium">카테고리가 아직 없습니다</p>
        </div>
      )}
    </div>
  );
}
