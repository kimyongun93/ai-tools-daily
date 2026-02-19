// ============================================
// AI Tools Daily — 수집 에이전트 오케스트레이터 v2
// Supabase Edge Function (Deno)
// 매일 06:00 KST에 pg_cron으로 실행
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { RawTool, ProcessedTool } from './types.ts';
import { fetchProductHunt } from './sources/producthunt.ts';
import { fetchThereIsAnAI } from './sources/theresanai.ts';
import { fetchFuturepedia } from './sources/futurepedia.ts';
import { fetchRSSFeeds } from './sources/rss.ts';
import { deduplicateTools } from './dedup.ts';
import { processToolsBatch } from './ai-processor.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- 소스 정의 ----------

interface SourceDef {
  name: string;
  fn: () => Promise<RawTool[]>;
}

const SOURCES: SourceDef[] = [
  { name: 'producthunt', fn: () => fetchProductHunt(Deno.env.get('PRODUCTHUNT_TOKEN') || '') },
  { name: 'theresanaiforthat', fn: fetchThereIsAnAI },
  { name: 'futurepedia', fn: fetchFuturepedia },
  { name: 'rss', fn: fetchRSSFeeds },
];

// ---------- 메인 핸들러 ----------

Deno.serve(async (req) => {
  // CORS 헤더 (수동 호출 대응)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const runDate = new Date().toISOString().split('T')[0];
  const startTime = Date.now();
  const errors: Record<string, string> = {};

  // 실행 로그 생성
  const { data: run } = await supabase
    .from('agent_runs')
    .insert({ source: 'collect-ai-tools', status: 'running' })
    .select()
    .single();

  try {
    // ========== 1. 멀티소스 병렬 수집 ==========
    console.log('[Agent] 수집 시작...');
    const sourceResults = await Promise.allSettled(
      SOURCES.map((s) => s.fn())
    );

    const allRaw: RawTool[] = [];
    const sourceStats: Record<string, number> = {};

    for (let i = 0; i < sourceResults.length; i++) {
      const result = sourceResults[i];
      const sourceName = SOURCES[i].name;

      if (result.status === 'fulfilled') {
        allRaw.push(...result.value);
        sourceStats[sourceName] = result.value.length;
        console.log(`[Agent] ${sourceName}: ${result.value.length}개 수집`);
      } else {
        errors[`source_${sourceName}`] = result.reason?.message || 'Unknown error';
        sourceStats[sourceName] = 0;
        console.warn(`[Agent] ${sourceName} 실패:`, result.reason?.message);
      }
    }

    console.log(`[Agent] 총 ${allRaw.length}개 원시 데이터 수집 완료`);

    // ========== 2. 중복 제거 ==========
    const dedupResult = await deduplicateTools(allRaw, supabase);
    console.log(`[Agent] 중복 제거 후: ${dedupResult.newTools.length}개`);

    // ========== 3. Claude AI 처리 (배치) ==========
    let processed: ProcessedTool[] = [];
    if (dedupResult.newTools.length > 0 && claudeApiKey) {
      const aiResult = await processToolsBatch(dedupResult.newTools, claudeApiKey);
      processed = aiResult.processed;
      Object.assign(errors, aiResult.errors);
    } else if (!claudeApiKey) {
      console.warn('[Agent] CLAUDE_API_KEY 미설정 → AI 처리 스킵');
    }

    // ========== 4. DB 저장 ==========
    const savedCount = await saveTools(processed);
    console.log(`[Agent] DB 저장: ${savedCount}개`);

    // ========== 5. 다이제스트 생성 ==========
    await createDailyDigest(runDate);

    // ========== 6. 실행 로그 업데이트 ==========
    const duration = Date.now() - startTime;
    const hasErrors = Object.keys(errors).length > 0;

    await supabase
      .from('agent_runs')
      .update({
        status: hasErrors ? 'partial' : 'success',
        tools_found: allRaw.length,
        tools_saved: savedCount,
        details: {
          duplicates: dedupResult.duplicateCount,
          dedup_details: dedupResult.details,
          source_stats: sourceStats,
          errors: hasErrors ? errors : null,
          duration_ms: duration,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);

    const responseBody = {
      success: true,
      date: runDate,
      collected: allRaw.length,
      new: savedCount,
      duplicates: dedupResult.duplicateCount,
      dedup_details: dedupResult.details,
      source_stats: sourceStats,
      errors_count: Object.keys(errors).length,
      duration_ms: duration,
    };

    console.log(`[Agent] 완료! ${JSON.stringify(responseBody)}`);

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        details: {
          fatal: (error as Error).message,
          errors,
          duration_ms: duration,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', run?.id);

    console.error(`[Agent] 치명적 에러:`, (error as Error).message);

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ---------- DB 저장 ----------

async function saveTools(tools: ProcessedTool[]): Promise<number> {
  let savedCount = 0;

  for (const tool of tools) {
    try {
      // 슬러그 생성 (URL-safe, 유니크)
      const baseSlug = tool.name
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const { error } = await supabase.from('ai_tools').insert({
        name: tool.name,
        slug: uniqueSlug,
        summary_ko: tool.summary_ko,
        description_en: tool.description,
        url: tool.url,
        logo_url: tool.logo_url,
        category_slug: tool.category_slug,
        tags: tool.tags,
        pricing_type: tool.pricing_type,
        pricing_detail: tool.pricing_detail,
        score: tool.score,
        source: tool.source,
        source_url: tool.source_url,
        launched_at: new Date().toISOString().split('T')[0],
      });

      if (error) {
        console.warn(`[Save] "${tool.name}" 저장 실패:`, error.message);
      } else {
        savedCount++;
      }
    } catch (e) {
      console.warn(`[Save] "${tool.name}" 저장 에러:`, (e as Error).message);
    }
  }

  return savedCount;
}

// ---------- 다이제스트 생성 ----------

async function createDailyDigest(date: string) {
  const { data: todayTools } = await supabase
    .from('ai_tools')
    .select('id, score, name')
    .gte('created_at', `${date}T00:00:00`)
    .eq('is_published', true)
    .order('score', { ascending: false });

  if (!todayTools || todayTools.length === 0) {
    console.log('[Digest] 오늘 발행할 도구 없음');
    return;
  }

  const featuredTool = todayTools[0];
  const toolIds = todayTools.map((t: any) => t.id);

  // featured 마킹
  if (featuredTool) {
    await supabase
      .from('ai_tools')
      .update({ is_featured: true })
      .eq('id', featuredTool.id);
  }

  // 다이제스트 upsert
  await supabase.from('daily_digests').upsert(
    {
      digest_date: date,
      title: `오늘의 AI 툴 ${todayTools.length}선`,
      summary: `${todayTools.length}개의 새로운 AI 도구가 발견되었습니다. 오늘의 추천: ${featuredTool?.name || ''}`,
      featured_tool_id: featuredTool?.id,
      tool_ids: toolIds,
      tool_count: todayTools.length,
      is_published: true,
    },
    { onConflict: 'digest_date' }
  );

  console.log(`[Digest] "${date}" 다이제스트 생성 완료 (${todayTools.length}개, 추천: ${featuredTool?.name})`);
}
