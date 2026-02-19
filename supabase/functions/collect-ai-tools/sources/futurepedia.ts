// ============================================
// Futurepedia 소스 수집기
// __NEXT_DATA__ JSON 또는 HTML 파싱으로 최신 AI 도구 수집
// ============================================

import type { RawTool } from '../types.ts';

const FUTUREPEDIA_URL = 'https://www.futurepedia.io/ai-tools?sort=new';

export async function fetchFuturepedia(): Promise<RawTool[]> {
  try {
    const res = await fetch(FUTUREPEDIA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`Futurepedia: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const tools: RawTool[] = [];

    // 방법 1: __NEXT_DATA__ JSON 추출 (Next.js 앱)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;

        // Futurepedia의 데이터 구조를 여러 경로로 탐색
        const toolsData = pageProps?.tools
          || pageProps?.initialTools
          || pageProps?.aiTools
          || pageProps?.data?.tools
          || [];

        if (Array.isArray(toolsData) && toolsData.length > 0) {
          for (const t of toolsData.slice(0, 30)) {
            const name = t.toolName || t.name || t.title;
            const url = t.toolUrl || t.websiteUrl || t.url || t.link;

            if (!name || !url) continue;

            tools.push({
              name,
              url,
              description: t.toolShortDescription || t.shortDescription || t.description || undefined,
              logo_url: t.toolImage || t.logo || t.image || t.favicon || undefined,
              source: 'futurepedia',
              source_url: t.futurepediaUrl
                ? `https://www.futurepedia.io${t.futurepediaUrl}`
                : t.slug
                  ? `https://www.futurepedia.io/tool/${t.slug}`
                  : undefined,
              metadata: {
                categories: t.toolCategories || t.categories || [],
                pricing: t.pricing || t.pricingModel || null,
              },
            });
          }
        }
      } catch (e) {
        console.warn('[Futurepedia] __NEXT_DATA__ 파싱 실패:', (e as Error).message);
      }
    }

    // 방법 2: HTML 정규식 파싱 (fallback)
    if (tools.length === 0) {
      // tool 카드 링크 패턴
      const cardPattern = /<a[^>]*href="(\/tool\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const seenSlugs = new Set<string>();

      let match;
      while ((match = cardPattern.exec(html)) !== null) {
        const href = match[1];
        const inner = match[2];

        if (seenSlugs.has(href)) continue;
        seenSlugs.add(href);

        // 이름 추출
        const nameMatch = inner.match(/<(?:h[2-4]|span|div)[^>]*class="[^"]*(?:name|title)[^"]*"[^>]*>(.*?)<\/(?:h[2-4]|span|div)>/i)
          || inner.match(/<(?:h[2-4])[^>]*>(.*?)<\/(?:h[2-4])>/i);
        const name = nameMatch
          ? nameMatch[1].replace(/<[^>]+>/g, '').trim()
          : null;

        if (!name || name.length < 2) continue;

        // 설명 추출
        const descMatch = inner.match(/<p[^>]*>(.*?)<\/p>/i);
        const description = descMatch
          ? descMatch[1].replace(/<[^>]+>/g, '').trim()
          : undefined;

        // 이미지 추출
        const imgMatch = inner.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
        const logo_url = imgMatch ? imgMatch[1] : undefined;

        tools.push({
          name,
          url: `https://www.futurepedia.io${href}`,
          description,
          logo_url,
          source: 'futurepedia',
          source_url: `https://www.futurepedia.io${href}`,
        });
      }
    }

    console.log(`[Futurepedia] ${tools.length}개 도구 파싱 완료`);
    return tools.slice(0, 30);
  } catch (err) {
    console.error('[Futurepedia] 수집 실패:', (err as Error).message);
    throw err;
  }
}
