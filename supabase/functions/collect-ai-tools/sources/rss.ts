// ============================================
// RSS 피드 소스 수집기
// AI 관련 RSS/Atom 피드에서 최근 기사 수집
// ============================================

import type { RawTool } from '../types.ts';

// AI 도구 관련 RSS 피드 목록
const RSS_FEEDS = [
  { url: 'https://www.marktechpost.com/feed/', name: 'MarkTechPost' },
  { url: 'https://www.artificialintelligence-news.com/feed/', name: 'AI News' },
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', name: 'TechCrunch AI' },
];

// AI 관련 키워드 필터
const AI_KEYWORDS = /\b(ai\s+tool|ai\s+app|ai\s+platform|ai-powered|gpt|llm|chatbot|generative ai|machine learning tool|ai assistant|text.to.image|text.to.video|ai\s+writing|ai\s+coding|copilot|ai\s+agent)\b/i;

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

/** 간단한 RSS/Atom XML 파서 (정규식 기반, Deno 호환) */
function parseRSSItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  // RSS <item> 태그
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];

    // title 추출 (CDATA 지원)
    const titleMatch = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i)
      || content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || '';

    // link 추출
    const linkMatch = content.match(/<link>(.*?)<\/link>/i)
      || content.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
    const link = linkMatch?.[1]?.trim() || '';

    // description 추출 (CDATA 지원)
    const descMatch = content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)
      || content.match(/<description>([\s\S]*?)<\/description>/i);
    const description = descMatch?.[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 500) || '';

    // pubDate 추출
    const dateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/i)
      || content.match(/<published>(.*?)<\/published>/i);
    const pubDate = dateMatch?.[1]?.trim();

    if (title && link) {
      items.push({ title, link, description, pubDate });
    }
  }

  // Atom <entry> 태그 (fallback)
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const content = match[1];

      const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || '';

      const linkMatch = content.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
      const link = linkMatch?.[1]?.trim() || '';

      const summaryMatch = content.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)
        || content.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
      const description = summaryMatch?.[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 500) || '';

      const dateMatch = content.match(/<published>(.*?)<\/published>/i)
        || content.match(/<updated>(.*?)<\/updated>/i);
      const pubDate = dateMatch?.[1]?.trim();

      if (title && link) {
        items.push({ title, link, description, pubDate });
      }
    }
  }

  return items;
}

/** 48시간 이내의 기사만 필터 */
function isRecent(pubDate?: string): boolean {
  if (!pubDate) return true; // 날짜 없으면 포함
  try {
    const itemDate = new Date(pubDate);
    if (isNaN(itemDate.getTime())) return true;
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return itemDate >= cutoff;
  } catch {
    return true;
  }
}

export async function fetchRSSFeeds(): Promise<RawTool[]> {
  const allTools: RawTool[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'AIToolsDaily/1.0 RSS Reader',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!res.ok) {
        throw new Error(`RSS ${feed.name}: ${res.status}`);
      }

      const xml = await res.text();
      const items = parseRSSItems(xml);

      return items
        .filter((item) => isRecent(item.pubDate))
        .filter((item) => AI_KEYWORDS.test(item.title) || AI_KEYWORDS.test(item.description))
        .map((item): RawTool => ({
          name: item.title.slice(0, 100),
          url: item.link,
          description: item.description,
          source: 'rss',
          source_url: item.link,
          metadata: {
            feed_name: feed.name,
            pub_date: item.pubDate,
          },
        }));
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allTools.push(...result.value);
    } else {
      console.warn('[RSS] 피드 실패:', result.reason?.message);
    }
  }

  console.log(`[RSS] ${RSS_FEEDS.length}개 피드에서 ${allTools.length}개 항목 수집`);
  return allTools;
}
