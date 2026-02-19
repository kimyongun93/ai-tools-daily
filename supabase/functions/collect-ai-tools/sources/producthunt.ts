// ============================================
// Product Hunt 소스 수집기
// GraphQL API를 사용하여 최근 24시간 AI 관련 포스트 수집
// ============================================

import type { RawTool } from '../types.ts';

const PH_GRAPHQL_URL = 'https://api.producthunt.com/v2/api/graphql';

// AI 관련 토픽 필터
const AI_TOPICS = new Set([
  'artificial-intelligence', 'machine-learning', 'ai', 'generative-ai',
  'chatgpt', 'llm', 'natural-language-processing', 'computer-vision',
  'ai-tools', 'deep-learning', 'text-to-image', 'text-to-video',
  'ai-assistants', 'ai-chatbots', 'ai-writing', 'ai-coding',
]);

// AI 관련 키워드 (토픽이 없을 때 이름/태그라인으로 필터)
const AI_KEYWORDS = /\b(ai|artificial intelligence|gpt|llm|machine learning|neural|deep learning|generative|copilot|chatbot|automation)\b/i;

export async function fetchProductHunt(token: string): Promise<RawTool[]> {
  if (!token) {
    console.warn('[PH] PRODUCTHUNT_TOKEN 미설정, 스킵');
    return [];
  }

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const query = `query {
      posts(order: NEWEST, first: 50, postedAfter: "${yesterday}") {
        edges {
          node {
            name
            tagline
            url
            website
            thumbnail { url }
            topics { edges { node { name slug } } }
            votesCount
          }
        }
      }
    }`;

    const res = await fetch(PH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      throw new Error(`Product Hunt API: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const posts = json.data?.posts?.edges || [];

    const tools: RawTool[] = posts
      .filter((edge: any) => {
        const topics = edge.node.topics?.edges?.map((t: any) => t.node.slug) || [];
        const hasAITopic = topics.some((t: string) => AI_TOPICS.has(t));
        const hasAIKeyword = AI_KEYWORDS.test(edge.node.name) || AI_KEYWORDS.test(edge.node.tagline || '');
        return hasAITopic || hasAIKeyword;
      })
      .map((edge: any): RawTool => ({
        name: edge.node.name,
        url: edge.node.website || edge.node.url,
        description: edge.node.tagline,
        logo_url: edge.node.thumbnail?.url || undefined,
        source: 'producthunt',
        source_url: edge.node.url,
        metadata: {
          votes: edge.node.votesCount,
          categories: edge.node.topics?.edges?.map((t: any) => t.node.name) || [],
        },
      }));

    console.log(`[PH] ${posts.length}개 포스트 중 ${tools.length}개 AI 관련 도구 필터링`);
    return tools;
  } catch (err) {
    console.error('[PH] 수집 실패:', (err as Error).message);
    throw err;
  }
}
