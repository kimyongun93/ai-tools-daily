import { createClient } from '@supabase/supabase-js';

// 읽기 전용 서버 사이드 Supabase 클라이언트
// 쿠키 기반 인증이 필요 없는 public 읽기 쿼리에 최적화
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
