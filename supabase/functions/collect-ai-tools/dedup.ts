// ============================================
// 중복 제거 모듈
// URL 정규화 + Levenshtein 유사도 기반 퍼지 매칭
// ============================================

import type { RawTool, DeduplicationResult } from './types.ts';

// ---------- URL 정규화 ----------

/** URL을 정규화하여 비교 가능한 형태로 변환 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // 1. 프로토콜 제거, 소문자화
    let host = u.hostname.toLowerCase();
    // 2. www. 제거
    host = host.replace(/^www\./, '');
    // 3. 경로 정규화: trailing slash, 불필요한 파라미터 제거
    let path = u.pathname.replace(/\/+$/, '').toLowerCase();
    // 4. 추적 파라미터 제거 (utm_, ref, source 등)
    const params = new URLSearchParams(u.search);
    const trackingKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source', 'via', 'from'];
    for (const key of trackingKeys) {
      params.delete(key);
    }
    const query = params.toString();
    return `${host}${path}${query ? '?' + query : ''}`;
  } catch {
    // URL 파싱 실패 시 단순 정규화
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '')
      .toLowerCase();
  }
}

// ---------- Levenshtein 거리 ----------

/** 두 문자열 간 Levenshtein 편집 거리 계산 (Wagner-Fischer 알고리즘) */
function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  // 빈 문자열 최적화
  if (la === 0) return lb;
  if (lb === 0) return la;

  // 메모리 최적화: 2행만 사용
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // 삭제
        curr[j - 1] + 1,   // 삽입
        prev[j - 1] + cost  // 교체
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/** 이름 유사도 비율 (0~1, 1이면 완전 동일) */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (na === nb) return 1;

  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;

  const dist = levenshteinDistance(na, nb);
  return 1 - dist / maxLen;
}

/** 이름 정규화: 소문자, 특수문자 제거, 공백 통일 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.\-_]/g, ' ')        // 구분자 → 공백
    .replace(/\b(ai|app|tool|io|co|the|by)\b/g, '') // 불용어 제거
    .replace(/[^a-z0-9가-힣\s]/g, '') // 특수문자 제거
    .replace(/\s+/g, ' ')           // 다중 공백 통일
    .trim();
}

// ---------- 중복 제거 메인 로직 ----------

const NAME_SIMILARITY_THRESHOLD = 0.85; // 85% 이상 유사하면 중복

interface SupabaseClient {
  from: (table: string) => any;
}

export async function deduplicateTools(
  rawTools: RawTool[],
  supabase: SupabaseClient
): Promise<DeduplicationResult> {
  const details = { urlDuplicates: 0, nameDuplicates: 0, batchDuplicates: 0 };

  // 1. DB에서 기존 도구 URL + 이름 조회
  const { data: existingTools } = await supabase
    .from('ai_tools')
    .select('url, name')
    .order('created_at', { ascending: false })
    .limit(500); // 최근 500개만 비교 (성능 최적화)

  const existingUrls = new Set(
    (existingTools || []).map((t: any) => normalizeUrl(t.url))
  );
  const existingNames: string[] = (existingTools || []).map((t: any) => t.name);

  // 2. 배치 내 중복 + DB 중복 동시 제거
  const seenUrls = new Set<string>();
  const seenNames: string[] = [];
  const newTools: RawTool[] = [];

  for (const tool of rawTools) {
    const normUrl = normalizeUrl(tool.url);

    // 2-1. URL 중복 (DB)
    if (existingUrls.has(normUrl)) {
      details.urlDuplicates++;
      continue;
    }

    // 2-2. URL 중복 (배치 내)
    if (seenUrls.has(normUrl)) {
      details.batchDuplicates++;
      continue;
    }

    // 2-3. 이름 유사도 중복 (DB)
    const isNameDupDB = existingNames.some(
      (existing) => nameSimilarity(tool.name, existing) >= NAME_SIMILARITY_THRESHOLD
    );
    if (isNameDupDB) {
      details.nameDuplicates++;
      continue;
    }

    // 2-4. 이름 유사도 중복 (배치 내)
    const isNameDupBatch = seenNames.some(
      (seen) => nameSimilarity(tool.name, seen) >= NAME_SIMILARITY_THRESHOLD
    );
    if (isNameDupBatch) {
      details.batchDuplicates++;
      continue;
    }

    seenUrls.add(normUrl);
    seenNames.push(tool.name);
    newTools.push(tool);
  }

  const duplicateCount = details.urlDuplicates + details.nameDuplicates + details.batchDuplicates;
  console.log(`[Dedup] ${rawTools.length}개 중 ${duplicateCount}개 중복 제거 → ${newTools.length}개 신규`);
  console.log(`[Dedup] URL 중복: ${details.urlDuplicates}, 이름 중복: ${details.nameDuplicates}, 배치 중복: ${details.batchDuplicates}`);

  return { newTools, duplicateCount, details };
}
