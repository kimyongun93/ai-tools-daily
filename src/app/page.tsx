import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ToolCard } from '@/components/ToolCard';
import { FeaturedTool } from '@/components/FeaturedTool';
import type { ToolWithCategory, DailyDigest } from '@/types';

// ISR: 5분마다 재생성
export const revalidate = 300;

async function getTodayDigest() {
  const supabase = createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: digest } = await supabase
    .from('daily_digests')
    .select('*')
    .eq('digest_date', today)
    .eq('is_published', true)
    .single();

  return digest as DailyDigest | null;
}

async function getTodayTools() {
  const supabase = createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: tools } = await supabase
    .from('tools')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .gte('created_at', `${today}T00:00:00`)
    .order('score', { ascending: false, nullsFirst: false });

  return (tools || []) as ToolWithCategory[];
}

async function getRecentTools() {
  const supabase = createServerSupabaseClient();

  const { data: tools } = await supabase
    .from('tools')
    .select('*, category:categories(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(20);

  return (tools || []) as ToolWithCategory[];
}

export default async function HomePage() {
  const [digest, todayTools, recentTools] = await Promise.all([
    getTodayDigest(),
    getTodayTools(),
    getRecentTools(),
  ]);

  const tools = todayTools.length > 0 ? todayTools : recentTools;
  const featured = tools.find((t) => t.is_featured) || tools[0];
  const restTools = tools.filter((t) => t.id !== featured?.id);

  return (
    <div className="pb-20 md:pb-6">
      {/* 오늘의 헤더 */}
      <section className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {digest?.title || '오늘의 AI 툴'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
          {digest?.summary || `${tools.length}개의 새로운 AI 툴이 발견되었습니다`}
        </p>
      </section>

      {/* 오늘의 추천 */}
      {featured && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
            ⭐ Pick of the Day
          </h2>
          <FeaturedTool tool={featured} />
        </section>
      )}

      {/* 툴 목록 */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>
          전체 목록
        </h2>
        <div className="grid gap-3">
          {restTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>

        {tools.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-dim)' }}>
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">아직 오늘의 AI 툴이 수집되지 않았습니다</p>
            <p className="text-sm mt-1">매일 아침 7시에 새로운 툴이 업데이트됩니다</p>
          </div>
        )}
      </section>
    </div>
  );
}
