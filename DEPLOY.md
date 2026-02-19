# AI Tools Daily — 배포 가이드

## 1. 사전 준비

### 필요한 계정
- **Vercel** — 프론트엔드 배포
- **Supabase** — DB + Edge Functions
- **Anthropic** — Claude Haiku API (도구 분석용)

### VAPID 키 생성 (푸시 알림용)
```bash
npx web-push generate-vapid-keys
```
→ Public Key와 Private Key를 메모해둡니다.

---

## 2. Supabase 설정

### 2-1. 프로젝트 생성
1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. Region: **Northeast Asia (Seoul)** 선택
3. 프로젝트 URL과 anon/service_role 키 복사

### 2-2. 데이터베이스 마이그레이션
SQL Editor에서 `supabase/migrations/` 폴더의 SQL 파일을 순서대로 실행합니다:
```
001_create_tables.sql
002_create_indexes.sql
003_enable_rls.sql
004_create_functions.sql
```

### 2-3. Edge Functions 배포
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인 + 프로젝트 링크
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Edge Functions 배포
supabase functions deploy collect-ai-tools
supabase functions deploy send-push
```

### 2-4. Edge Function 환경변수 설정
Supabase Dashboard → Settings → Edge Functions → Secrets:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CLAUDE_API_KEY=sk-ant-...
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:your@email.com
PRODUCTHUNT_TOKEN=xxx (선택)
```

---

## 3. Vercel 배포

### 3-1. 프로젝트 연결
```bash
# Vercel CLI
npm i -g vercel
vercel login
vercel --prod
```
또는 GitHub에 push 후 Vercel Dashboard에서 Import합니다.

### 3-2. 환경변수 설정
Vercel Dashboard → Settings → Environment Variables:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 | `eyJ...` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID 공개 키 | `BN...` |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL | `https://ai-tools-daily.vercel.app` |
| `ADMIN_API_KEY` | 관리자 API 키 (직접 생성) | `atd-admin-xxx` |
| `REVALIDATE_SECRET` | ISR 갱신 시크릿 | `revalidate-secret-xxx` |
| `CRON_SECRET` | Vercel Cron 인증 시크릿 | `cron-secret-xxx` |

### 3-3. 빌드 설정 확인
- Framework Preset: **Next.js**
- Build Command: `npm run build`
- Output Directory: `.next`
- Node.js Version: `18.x` 이상

---

## 4. 동작 확인

### Cron 자동 수집
`vercel.json`에 설정된 Cron이 매일 22:00 UTC (= 07:00 KST)에 실행됩니다:
```
/api/cron/collect → Edge Function 호출 → ISR 갱신 → 푸시 알림
```

### 수동 수집 (테스트)
```bash
# Admin API로 직접 Edge Function 호출
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/collect-ai-tools \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 관리자 대시보드
`https://your-domain.com/admin`에서 API Key로 로그인하여:
- 수집 현황 실시간 확인
- 수동 수집 트리거
- ISR 캐시 갱신

---

## 5. 아키텍처 요약

```
[매일 07:00 KST]
    │
    ▼
Vercel Cron ─→ /api/cron/collect
    │
    ▼
Supabase Edge Function: collect-ai-tools
    ├─ Product Hunt API
    ├─ TAAFT 크롤링
    ├─ Futurepedia 크롤링
    └─ RSS 피드
    │
    ▼
Claude Haiku API (한국어 요약 + 분류 + 점수)
    │
    ▼
Supabase PostgreSQL (중복 제거 후 저장)
    │
    ▼
ISR Revalidation + Push 알림 발송
    │
    ▼
사용자 브라우저 (PWA / 웹)
```

---

## 6. 트러블슈팅

### 수집이 안 될 때
1. Supabase Edge Function 로그 확인: Dashboard → Edge Functions → Logs
2. `CLAUDE_API_KEY` 유효한지 확인
3. Rate limit에 걸렸다면 30분 후 재시도

### 푸시 알림이 안 올 때
1. VAPID 키 쌍이 올바른지 확인 (Public + Private 매칭)
2. 브라우저에서 알림 권한이 허용되어 있는지 확인
3. Service Worker가 정상 등록되었는지 DevTools → Application → SW 확인

### 빌드 에러
1. `npm run build`로 로컬에서 먼저 확인
2. TypeScript 에러는 `npx tsc --noEmit`으로 사전 체크
3. `.env.local` 파일에 최소한의 플레이스홀더 값이 있는지 확인
