import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ---------- Rate Limiter (메모리 기반, 단일 인스턴스용) ----------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1분
const RATE_LIMIT_MAX = 30; // 분당 최대 요청

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// 오래된 엔트리 주기적 정리
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((val, key) => {
    if (now > val.resetAt) rateLimitMap.delete(key);
  });
}, 60_000);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---------- API 라우트 보호 ----------
  if (pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Rate Limit 체크
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Admin API 인증 확인 (자세한 인증은 라우트 내부에서)
    if (pathname.startsWith('/api/admin/')) {
      const auth = req.headers.get('authorization');
      if (!auth || !auth.startsWith('Bearer ')) {
        return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
      }
    }

    // Cron API — Vercel Cron 시크릿 확인
    if (pathname.startsWith('/api/cron/')) {
      const cronSecret = req.headers.get('authorization');
      if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: '권한 없음' }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
