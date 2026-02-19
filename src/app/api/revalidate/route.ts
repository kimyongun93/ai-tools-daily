// ============================================
// ISR Revalidate API
// POST /api/revalidate — 캐시 수동 갱신
// 에이전트 수집 완료 후 또는 수동 트리거 시 호출
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  // 시크릿 토큰 인증
  const token = req.headers.get('x-revalidate-token');
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { paths, tags, all } = body;

    const revalidated: string[] = [];

    // 전체 갱신
    if (all) {
      revalidatePath('/', 'layout');
      revalidated.push('/ (전체)');
    }

    // 특정 경로 갱신
    if (Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path);
        revalidated.push(path);
      }
    }

    // 태그 기반 갱신
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        revalidateTag(tag);
        revalidated.push(`tag:${tag}`);
      }
    }

    // 기본: 홈 + 검색 페이지 갱신
    if (!all && !paths && !tags) {
      revalidatePath('/');
      revalidatePath('/search');
      revalidated.push('/', '/search');
    }

    return NextResponse.json({
      success: true,
      revalidated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
