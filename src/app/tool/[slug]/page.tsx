import { createServerSupabaseClient } from '@/lib/supabase-server';
import { BookmarkButton } from '@/components/BookmarkButton';
import { ShareButton } from '@/components/ShareButton';
import type { ToolWithCategory } from '@/types';
import type { Metadata } from 'next';

export const revalidate = 600;

interface Props {
  params: { slug: string };
}

async function getTool(slug: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('ai_tools')
    .select('*, category:categories!category_slug(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  return data as ToolWithCategory | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = await getTool(params.slug);
  if (!tool) return { title: '찾을 수 없음' };
  return {
    title: tool.name,
    description: tool.summary_ko || tool.description_en || '',
  };
}

const PRICING_LABELS: Record<string, string> = {
  free: '무료',
  freemium: '프리미엄',
  paid: '유료',
  contact: '문의',
};

export default async function ToolDetailPage({ params }: Props) {
  const tool = await getTool(params.slug);

  if (!tool) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
        <p className="text-4xl mb-3">🤷</p>
        <p className="font-medium">해당 툴을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      {/* 뒤로가기 */}
      <a href="/" className="inline-flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        ← 뒤로
      </a>

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: 'var(--surface2)' }}
          >
            {tool.logo_url ? (
              <img src={tool.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              tool.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tool.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {tool.category && (
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  {tool.category.icon} {tool.category.name}
                </span>
              )}
              {tool.score && (
                <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  ★ {tool.score}
                </span>
              )}
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                {PRICING_LABELS[tool.pricing_type]}
                {tool.pricing_detail && ` · ${tool.pricing_detail}`}
              </span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <BookmarkButton toolId={tool.id} size="md" />
          <ShareButton title={tool.name} url={`/tool/${tool.slug}`} text={tool.summary_ko || undefined} size="md" />
        </div>
      </div>

      {/* 스크린샷 */}
      {tool.screenshot_url && (
        <div className="rounded-xl overflow-hidden border mb-6" style={{ borderColor: 'var(--border)' }}>
          <img src={tool.screenshot_url} alt={tool.name} className="w-full" />
        </div>
      )}

      {/* 요약 */}
      <div className="rounded-xl border p-5 mb-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold mb-2">📝 요약</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          {tool.summary_ko || tool.description_en || '설명이 없습니다.'}
        </p>
      </div>

      {/* 태그 */}
      {tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--text-dim)' }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center py-3 rounded-xl font-semibold text-sm text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          사이트 방문하기 →
        </a>
      </div>
    </div>
  );
}
