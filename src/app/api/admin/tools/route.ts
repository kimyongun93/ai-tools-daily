// ============================================
// 어드민 수동 도구 등록 API
// POST /api/admin/tools — 수동으로 AI 도구 추가
// GET  /api/admin/tools — 최근 등록 도구 목록
// ============================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Service Role 키로 RLS 우회 (어드민 전용)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다');
  }

  return createClient(url, key);
}

// 간단한 API Key 인증
function authenticate(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) return false;
  return authHeader === `Bearer ${adminKey}`;
}

// ---------- POST: 도구 수동 등록 ----------

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, url, summary_ko, category_slug, tags, pricing_type, pricing_detail, score, logo_url, description_en } = body;

    // 필수 필드 검증
    if (!name || !url) {
      return NextResponse.json(
        { error: 'name, url은 필수입니다' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 카테고리 조회
    let categoryId = null;
    if (category_slug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category_slug)
        .single();
      categoryId = cat?.id || null;
    }

    // 슬러그 생성
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const { data, error } = await supabase
      .from('tools')
      .insert({
        name,
        slug: `${baseSlug}-${Date.now().toString(36)}`,
        url,
        summary_ko: summary_ko || `${name} - 새로운 AI 도구`,
        description_en: description_en || null,
        category_id: categoryId,
        tags: tags || [],
        pricing_type: pricing_type || 'free',
        pricing_detail: pricing_detail || null,
        score: score ? Math.min(5, Math.max(1, score)) : 3.0,
        logo_url: logo_url || null,
        source: 'manual',
        launched_at: new Date().toISOString().split('T')[0],
        is_published: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tool: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// ---------- GET: 최근 도구 목록 ----------

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const source = searchParams.get('source'); // 특정 소스만 필터

    let query = supabase
      .from('tools')
      .select('id, name, slug, url, source, score, is_published, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tools: data, count: data?.length || 0 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
