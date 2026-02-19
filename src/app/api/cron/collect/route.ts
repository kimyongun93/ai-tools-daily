// ============================================
// Vercel Cron → Supabase Edge Function 트리거
// 매일 22:00 UTC (= 07:00 KST 다음날) 실행
// 수집 완료 후 ISR 캐시 무효화
// ============================================

import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: '환경변수 미설정' }, { status: 500 });
  }

  try {
    // 1. Supabase Edge Function 호출 (수집 에이전트)
    const collectRes = await fetch(
      `${supabaseUrl}/functions/v1/collect-ai-tools`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const collectResult = await collectRes.json();

    // 2. 수집 후 ISR 캐시 갱신
    const revalidateSecret = process.env.REVALIDATE_SECRET;
    if (revalidateSecret) {
      await fetch(`${getBaseUrl()}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-token': revalidateSecret,
        },
        body: JSON.stringify({ all: true }),
      }).catch(() => {}); // 갱신 실패는 무시
    }

    // 3. 푸시 알림 전송
    if (collectResult.new > 0) {
      await fetch(
        `${supabaseUrl}/functions/v1/send-push`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      ...collectResult,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

function getBaseUrl(): string {
  // Vercel 배포 환경
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
