// ============================================
// AI Tools Daily — TypeScript Type Definitions
// ============================================

export type PricingType = 'free' | 'freemium' | 'paid' | 'contact';

export type AgentRunStatus = 'running' | 'success' | 'partial' | 'failed';

// ---------- DB Row Types ----------

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  summary_ko: string | null;
  description_en: string | null;
  url: string;
  logo_url: string | null;
  screenshot_url: string | null;
  category_id: string | null;
  tags: string[];
  pricing_type: PricingType;
  pricing_detail: string | null;
  score: number | null;
  source: string | null;
  source_url: string | null;
  launched_at: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
}

export interface ToolWithCategory extends Tool {
  category: Category | null;
}

export interface DailyDigest {
  id: string;
  digest_date: string;
  title: string | null;
  summary: string | null;
  featured_tool_id: string | null;
  tool_ids: string[];
  tool_count: number;
  is_published: boolean;
  created_at: string;
}

export interface DailyDigestWithTools extends DailyDigest {
  featured_tool: ToolWithCategory | null;
  tools: ToolWithCategory[];
}

export interface Bookmark {
  id: string;
  user_id: string;
  tool_id: string;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string | null;
  endpoint: string;
  p256dh: string | null;
  auth_key: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AgentRun {
  id: string;
  run_date: string;
  status: AgentRunStatus;
  tools_collected: number;
  tools_new: number;
  tools_duplicate: number;
  errors: Record<string, unknown> | null;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

// ---------- API / Component Types ----------

export interface DigestPageProps {
  params: { date: string };
}

export interface ToolPageProps {
  params: { slug: string };
}

export interface CategoryPageProps {
  params: { slug: string };
}

export interface SearchParams {
  q?: string;
  category?: string;
  pricing?: PricingType;
  sort?: 'latest' | 'score' | 'popular';
}

// ---------- Agent Types ----------

export interface RawToolData {
  name: string;
  url: string;
  description?: string;
  logo_url?: string;
  source: string;
  source_url?: string;
  launched_at?: string;
}

export interface AIProcessedTool extends RawToolData {
  summary_ko: string;
  category_slug: string;
  tags: string[];
  pricing_type: PricingType;
  pricing_detail: string | null;
  score: number;
}
