// ============================================
// Claude AI 프로세서
// 수집된 원시 데이터를 한국어 요약 + 분류 + 평가
// 배치 처리 + 재시도 + 구조화된 에러 핸들링
// ============================================

import type { RawTool, ProcessedTool, PricingType, VALID_CATEGORY_SLUGS } from './types.ts';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const BATCH_SIZE = 5; // 동시 처리 개수
const REQUEST_DELAY_MS = 300; // Rate limit 방지

// ---------- 시스템 프롬프트 ----------

const SYSTEM_PROMPT = `당신은 AI 도구 분석 전문가입니다. 주어진 AI 도구 정보를 분석하여 정확한 JSON을 반환해주세요.

## 규칙
1. summary_ko: 한국어 2~3문장. "~하는 도구입니다" 형태로 시작. 핵심 기능과 대상 사용자를 포함.
2. category_slug: 반드시 아래 목록 중 하나만 선택:
   image-generation, text-generation, coding, video-generation, audio, document, marketing, data-analysis, design, productivity, search-research, chatbot, education, other
3. tags: 관련 키워드 3~5개 (한국어, 영어 혼합 가능). 카테고리와 겹치지 않는 구체적 키워드.
4. pricing_type: free(완전 무료), freemium(기본 무료+유료 플랜), paid(유료만), contact(문의 필요)
5. pricing_detail: 가격 정보가 있으면 한국어로 요약. 모르면 null.
6. score: 1.0~5.0 (소수점 1자리). 아래 3개 항목 평균:
   - 혁신성: 기존 대비 얼마나 새로운 접근인가
   - 실용성: 실무/일상에서 얼마나 유용한가
   - 접근성: 배우기 쉽고 시작하기 쉬운가

## 응답 형식
반드시 유효한 JSON만 반환하세요. 추가 설명 없이 JSON 객체만 출력합니다.`;

// ---------- 프롬프트 생성 ----------

function buildUserPrompt(tool: RawTool): string {
  const parts = [`이름: ${tool.name}`, `URL: ${tool.url}`];

  if (tool.description) {
    parts.push(`설명: ${tool.description.slice(0, 500)}`);
  }

  if (tool.source) {
    parts.push(`출처: ${tool.source}`);
  }

  if (tool.metadata) {
    const meta = tool.metadata;
    if (meta.votes) parts.push(`투표수: ${meta.votes}`);
    if (meta.categories) parts.push(`분류: ${(meta.categories as string[]).join(', ')}`);
    if (meta.pricing) parts.push(`가격 정보: ${meta.pricing}`);
  }

  return parts.join('\n');
}

// ---------- 단일 도구 AI 처리 ----------

async function processOneTool(
  tool: RawTool,
  claudeApiKey: string
): Promise<ProcessedTool> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(RETRY_DELAY_MS * attempt); // 지수 백오프
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt(tool) }],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        // Rate limit → 재시도
        if (status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '3');
          await sleep(retryAfter * 1000);
          continue;
        }
        // 서버 에러 → 재시도
        if (status >= 500) {
          throw new Error(`API 서버 에러: ${status}`);
        }
        // 클라이언트 에러 → 바로 실패
        throw new Error(`API 에러: ${status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';

      // JSON 추출 (```json ... ``` 블록 또는 순수 JSON)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        throw new Error('AI 응답에서 JSON을 찾을 수 없음');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return validateAndBuild(tool, parsed);
    } catch (err) {
      lastError = err as Error;
      console.warn(`[AI] "${tool.name}" 처리 실패 (시도 ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`);
    }
  }

  // 모든 재시도 실패 → 기본값 반환
  console.error(`[AI] "${tool.name}" 최종 실패, 기본값 사용`);
  return buildFallback(tool);
}

// ---------- 응답 검증 및 정규화 ----------

const VALID_SLUGS = new Set([
  'image-generation', 'text-generation', 'coding', 'video-generation',
  'audio', 'document', 'marketing', 'data-analysis', 'design',
  'productivity', 'search-research', 'chatbot', 'education', 'other',
]);

const VALID_PRICING: Set<PricingType> = new Set(['free', 'freemium', 'paid', 'contact']);

function validateAndBuild(tool: RawTool, parsed: any): ProcessedTool {
  // category_slug 검증
  const categorySlug = VALID_SLUGS.has(parsed.category_slug)
    ? parsed.category_slug
    : 'other';

  // pricing_type 검증
  const pricingType: PricingType = VALID_PRICING.has(parsed.pricing_type)
    ? parsed.pricing_type
    : 'free';

  // score 범위 제한
  const rawScore = parseFloat(parsed.score);
  const score = isNaN(rawScore) ? 3.0 : Math.round(Math.min(5, Math.max(1, rawScore)) * 10) / 10;

  // tags 검증 (문자열 배열, 최대 5개)
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((t: any) => typeof t === 'string').slice(0, 5)
    : [];

  // summary_ko 검증
  const summaryKo = typeof parsed.summary_ko === 'string' && parsed.summary_ko.length > 10
    ? parsed.summary_ko
    : tool.description || `${tool.name} - AI 도구`;

  return {
    ...tool,
    summary_ko: summaryKo,
    category_slug: categorySlug,
    tags,
    pricing_type: pricingType,
    pricing_detail: typeof parsed.pricing_detail === 'string' ? parsed.pricing_detail : null,
    score,
  };
}

/** AI 실패 시 기본값 폴백 */
function buildFallback(tool: RawTool): ProcessedTool {
  return {
    ...tool,
    summary_ko: tool.description
      ? `${tool.name}: ${tool.description.slice(0, 100)}`
      : `${tool.name} - 새롭게 출시된 AI 도구입니다.`,
    category_slug: 'other',
    tags: ['ai', 'new'],
    pricing_type: 'free',
    pricing_detail: null,
    score: 3.0,
  };
}

// ---------- 배치 처리 ----------

export async function processToolsBatch(
  tools: RawTool[],
  claudeApiKey: string
): Promise<{ processed: ProcessedTool[]; errors: Record<string, string> }> {
  const processed: ProcessedTool[] = [];
  const errors: Record<string, string> = {};

  // 배치 단위로 병렬 처리
  for (let i = 0; i < tools.length; i += BATCH_SIZE) {
    const batch = tools.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((tool) => processOneTool(tool, claudeApiKey))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const toolName = batch[j].name;

      if (result.status === 'fulfilled') {
        processed.push(result.value);
      } else {
        errors[toolName] = result.reason?.message || 'Unknown AI processing error';
        // 폴백 결과 추가
        processed.push(buildFallback(batch[j]));
      }
    }

    // 배치 간 쿨다운 (Rate limit 방지)
    if (i + BATCH_SIZE < tools.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`[AI] ${processed.length}개 처리 완료 (에러: ${Object.keys(errors).length}개)`);
  return { processed, errors };
}

// ---------- 유틸리티 ----------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
