-- ============================================
-- AI Tools Daily — Database Schema v2
-- Supabase PostgreSQL Migration
-- ============================================

-- 1. ENUM 타입
CREATE TYPE pricing_type AS ENUM ('free', 'freemium', 'paid', 'contact');

-- 2. categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('이미지 생성', 'image-generation', '🎨', 1),
  ('텍스트 생성', 'text-generation', '✍️', 2),
  ('코딩 도우미', 'coding', '💻', 3),
  ('영상 생성', 'video-generation', '🎬', 4),
  ('음악 & 오디오', 'audio', '🎵', 5),
  ('문서 작성', 'document', '📝', 6),
  ('마케팅', 'marketing', '📢', 7),
  ('데이터 분석', 'data-analysis', '📊', 8),
  ('디자인', 'design', '🎯', 9),
  ('생산성', 'productivity', '⚡', 10),
  ('검색 & 리서치', 'search-research', '🔍', 11),
  ('챗봇 & 어시스턴트', 'chatbot', '🤖', 12),
  ('교육', 'education', '📚', 13),
  ('기타', 'other', '🔧', 99);

-- 3. ai_tools (코드에서 사용하는 테이블명)
CREATE TABLE ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary_ko TEXT,
  description_en TEXT,
  url TEXT NOT NULL,
  logo_url TEXT,
  screenshot_url TEXT,
  category_slug TEXT REFERENCES categories(slug) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  pricing_type pricing_type DEFAULT 'free',
  pricing_detail TEXT,
  score NUMERIC(2,1) CHECK (score >= 1.0 AND score <= 5.0),
  source TEXT,
  source_url TEXT,
  launched_at DATE,
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tools_category ON ai_tools(category_slug);
CREATE INDEX idx_tools_created ON ai_tools(created_at DESC);
CREATE INDEX idx_tools_score ON ai_tools(score DESC NULLS LAST);
CREATE INDEX idx_tools_published ON ai_tools(is_published) WHERE is_published = true;
CREATE INDEX idx_tools_slug ON ai_tools(slug);
CREATE INDEX idx_tools_tags ON ai_tools USING GIN(tags);
CREATE INDEX idx_tools_source ON ai_tools(source);

-- FTS: 트리거 기반 (GENERATED COLUMN은 immutable 제약으로 사용 불가)
ALTER TABLE ai_tools ADD COLUMN fts tsvector;
CREATE INDEX idx_tools_fts ON ai_tools USING GIN(fts);

CREATE OR REPLACE FUNCTION ai_tools_fts_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.summary_ko, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tools_fts_and_updated
  BEFORE INSERT OR UPDATE ON ai_tools
  FOR EACH ROW EXECUTE FUNCTION ai_tools_fts_update();

-- 4. daily_digests
CREATE TABLE daily_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date DATE NOT NULL UNIQUE,
  title TEXT,
  summary TEXT,
  featured_tool_id UUID REFERENCES ai_tools(id) ON DELETE SET NULL,
  tool_ids UUID[] DEFAULT '{}',
  tool_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_digests_date ON daily_digests(digest_date DESC);

-- 5. push_subscriptions (익명 구독 지원)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_push_active ON push_subscriptions(is_active) WHERE is_active = true;

-- 6. agent_runs
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'collect-ai-tools',
  status TEXT NOT NULL DEFAULT 'running',
  tools_found INTEGER DEFAULT 0,
  tools_saved INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_agent_runs_created ON agent_runs(created_at DESC);
CREATE INDEX idx_agent_runs_source ON agent_runs(source);

-- ============================================
-- RLS 정책 (service_role 키는 RLS 우회)
-- ============================================
ALTER TABLE ai_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published tools" ON ai_tools FOR SELECT USING (is_published = true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);

ALTER TABLE daily_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published digests" ON daily_digests FOR SELECT USING (is_published = true);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage push" ON push_subscriptions FOR ALL USING (true);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON agent_runs FOR SELECT USING (false);
