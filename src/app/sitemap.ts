import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-tools-daily.vercel.app';

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/categories`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/bookmarks`, changeFrequency: 'weekly', priority: 0.5 },
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 카테고리 페이지
    const { data: categories } = await supabase
      .from('categories')
      .select('slug');

    if (categories) {
      for (const cat of categories) {
        entries.push({
          url: `${baseUrl}/category/${cat.slug}`,
          changeFrequency: 'daily',
          priority: 0.6,
        });
      }
    }

    // 도구 상세 페이지 (최근 200개)
    const { data: tools } = await supabase
      .from('tools')
      .select('slug, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(200);

    if (tools) {
      for (const tool of tools) {
        entries.push({
          url: `${baseUrl}/tool/${tool.slug}`,
          lastModified: new Date(tool.created_at),
          changeFrequency: 'weekly',
          priority: 0.5,
        });
      }
    }
  } catch {
    // DB 연결 실패 시 정적 페이지만 반환
  }

  return entries;
}
