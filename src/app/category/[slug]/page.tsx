import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ToolCard } from '@/components/ToolCard';
import type { ToolWithCategory, Category } from '@/types';
import type { Metadata } from 'next';

export const revalidate = 300;

interface Props {
  params: { slug: string };
}

async function getCategory(slug: string) {
  const supabase = createServerSupabaseClient();

  if (slug === 'all') {
    return { id: 'all', name: '전체', slug: 'all', icon: '📋' } as Category;
  }

  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  return data as Category | null;
}

async function getCategoryTools(slug: string) {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('tools')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (slug !== 'all') {
    // 카테고리 ID로 필터
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (cat) {
      query = query.eq('category_id', cat.id);
    }
  }

  const { data } = await query;
  return (data || []) as ToolWithCategory[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(params.slug);
  return {
    title: category ? `${category.icon} ${category.name}` : '카테고리',
    description: category ? `${category.name} 분야의 AI 도구 모음` : '',
  };
}

export default async function CategoryPage({ params }: Props) {
  const [category, tools] = await Promise.all([
    getCategory(params.slug),
    getCategoryTools(params.slug),
  ]);

  if (!category) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
        <p className="text-4xl mb-3">🤷</p>
        <p className="font-medium">카테고리를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      <a href="/categories" className="inline-flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        ← 카테고리 목록
      </a>

      <h1 className="text-2xl font-bold mb-1">
        {category.icon} {category.name}
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
        {tools.length}개의 AI 도구
      </p>

      <div className="grid gap-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      {tools.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-dim)' }}>
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">이 카테고리에는 아직 도구가 없습니다</p>
        </div>
      )}
    </div>
  );
}
