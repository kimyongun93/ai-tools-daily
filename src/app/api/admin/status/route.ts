// ============================================
// 운영 모니터링 API
// GET /api/admin/status — 시스템 상태
// ============================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function authenticate(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;
  return authHeader === `Bearer ${adminKey}`;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();

    const [
      { count: totalTools },
      { count: todayTools },
      { count: totalSubscriptions },
      { data: recentRuns },
    ] = await Promise.all([
      supabase.from('ai_tools').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('ai_tools').select('*', { count: 'exact', head: true })
        .gte('created_at', `${new Date().toISOString().split('T')[0]}T00:00:00`),
      supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(5),
    ]);

    const lastRun = recentRuns?.[0] || null;

    // 대시보드 페이지가 기대하는 형식으로 응답
    return NextResponse.json({
      total_tools: totalTools || 0,
      today_tools: todayTools || 0,
      active_push_subscriptions: totalSubscriptions || 0,
      last_agent_run: lastRun ? {
        id: lastRun.id,
        source: lastRun.source,
        status: lastRun.status,
        tools_found: lastRun.tools_found,
        tools_saved: lastRun.tools_saved,
        created_at: lastRun.created_at,
      } : null,
      recent_runs: (recentRuns || []).map((r: Record<string, unknown>) => ({
        id: r.id,
        source: r.source,
        status: r.status,
        tools_found: r.tools_found,
        tools_saved: r.tools_saved,
        created_at: r.created_at,
        details: r.details,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
