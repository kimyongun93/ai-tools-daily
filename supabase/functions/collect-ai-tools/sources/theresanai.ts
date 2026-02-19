// ============================================
// There's An AI For That (TAAFT) 소스 수집기
// 웹페이지 HTML 파싱으로 최신 AI 도구 수집
// ============================================

import type { RawTool } from '../types.ts';

const TAAFT_URL = 'https://theresanaiforthat.com/new/';

export async function fetchThereIsAnAI(): Promise<RawTool[]> {
  try {
    const res = await fetch(TAAFT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`TAAFT: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const tools: RawTool[] = [];

    // 방법 1: JSON-LD 구조화 데이터 파싱 시도
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonLd = JSON.parse(match[1]);
        if (jsonLd['@type'] === 'ItemList' && Array.isArray(jsonLd.itemListElement)) {
          for (const item of jsonLd.itemListElement) {
            const thing = item.item || item;
            if (thing.name && thing.url) {
              tools.push({
                name: thing.name,
                url: thing.url.startsWith('http') ? thing.url : `https://theresanaiforthat.com${thing.url}`,
                description: thing.description || undefined,
                logo_url: thing.image || undefined,
                source: 'theresanaiforthat',
                source_url: thing.url.startsWith('http') ? thing.url : `https://theresanaiforthat.com${thing.url}`,
              });
            }
          }
        }
      } catch {
        // JSON-LD 파싱 실패 — 무시하고 다음 방법 시도
      }
    }

    // 방법 2: JSON-LD가 없으면 HTML 파싱
    if (tools.length === 0) {
      // TAAFT의 도구 카드를 정규식으로 추출
      // 패턴: <a href="/ai/tool-name/"> 내부에 도구 정보
      const linkPattern = /<a[^>]*href="(\/ai\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const seenUrls = new Set<string>();

      let linkMatch;
      while ((linkMatch = linkPattern.exec(html)) !== null) {
        const relUrl = linkMatch[1];
        const inner = linkMatch[2];

        // 중복 URL 방지
        if (seenUrls.has(relUrl)) continue;
        seenUrls.add(relUrl);

        // 도구 이름 추출 (h3, h4, strong, 또는 텍스트)
        const nameMatch = inner.match(/<(?:h[2-4]|strong)[^>]*>(.*?)<\/(?:h[2-4]|strong)>/i);
        const name = nameMatch
          ? nameMatch[1].replace(/<[^>]+>/g, '').trim()
          : inner.replace(/<[^>]+>/g, '').trim().split('\n')[0]?.trim();

        if (!name || name.length < 2 || name.length > 100) continue;

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
          url: `https://theresanaiforthat.com${relUrl}`,
          description,
          logo_url,
          source: 'theresanaiforthat',
          source_url: `https://theresanaiforthat.com${relUrl}`,
        });
      }
    }

    console.log(`[TAAFT] ${tools.length}개 도구 파싱 완료`);
    return tools.slice(0, 30);
  } catch (err) {
    console.error('[TAAFT] 수집 실패:', (err as Error).message);
    throw err;
  }
}
