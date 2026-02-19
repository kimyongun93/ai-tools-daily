// ============================================
// Edge Function 공유 타입 정의
// 소스 수집기, 중복 제거, AI 프로세서에서 공통 사용
// ============================================

/** 소스에서 수집한 가공 전 원시 데이터 */
export interface RawTool {
  name: string;
  url: string;
  description?: string;
  logo_url?: string;
  source: 'producthunt' | 'theresanaiforthat' | 'futurepedia' | 'rss' | 'manual';
  source_url?: string;
  metadata?: Record<string, unknown>;
}

/** Claude AI가 분석한 후의 가공 데이터 */
export interface ProcessedTool extends RawTool {
  summary_ko: string;
  category_slug: string;
  tags: string[];
  pricing_type: PricingType;
  pricing_detail: string | null;
  score: number;
}

export type PricingType = 'free' | 'freemium' | 'paid' | 'contact';

/** 카테고리 슬러그 허용 목록 */
export const VALID_CATEGORY_SLUGS = [
  'image-generation',
  'text-generation',
  'coding',
  'video-generation',
  'audio',
  'document',
  'marketing',
  'data-analysis',
  'design',
  'productivity',
  'search-research',
  'chatbot',
  'education',
  'other',
] as const;

export type CategorySlug = (typeof VALID_CATEGORY_SLUGS)[number];

/** 중복 제거 결과 */
export interface DeduplicationResult {
  newTools: RawTool[];
  duplicateCount: number;
  details: {
    urlDuplicates: number;
    nameDuplicates: number;
    batchDuplicates: number;
  };
}
