import type { ToolWithCategory } from '@/types';
import { BookmarkButton } from './BookmarkButton';
import { ShareButton } from './ShareButton';

const PRICING_LABELS: Record<string, { text: string; color: string }> = {
  free: { text: '무료', color: '#34d399' },
  freemium: { text: '프리미엄', color: '#fb923c' },
  paid: { text: '유료', color: '#f472b6' },
  contact: { text: '문의', color: '#8b90a0' },
};

export function ToolCard({ tool }: { tool: ToolWithCategory }) {
  const pricing = PRICING_LABELS[tool.pricing_type] || PRICING_LABELS.free;

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:shadow-md group"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
    >
      <div className="flex gap-3">
        {/* 로고 */}
        <a href={`/tool/${tool.slug}`} className="flex-shrink-0">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl overflow-hidden"
            style={{ backgroundColor: 'var(--surface2)' }}
          >
            {tool.logo_url ? (
              <img src={tool.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold" style={{ color: 'var(--text-dim)' }}>
                {tool.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </a>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <a href={`/tool/${tool.slug}`} className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-sm truncate">{tool.name}</h3>
              {tool.score && (
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--accent)' }}>
                  ★ {tool.score}
                </span>
              )}
            </a>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
              <BookmarkButton toolId={tool.id} size="sm" />
              <ShareButton title={tool.name} url={`/tool/${tool.slug}`} size="sm" />
            </div>
          </div>

          <a href={`/tool/${tool.slug}`}>
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-dim)' }}>
              {tool.summary_ko || tool.description_en || '설명 없음'}
            </p>
          </a>

          <div className="flex items-center gap-2 mt-2">
            {tool.category && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--text-dim)' }}
              >
                {tool.category.icon} {tool.category.name}
              </span>
            )}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${pricing.color}18`, color: pricing.color }}
            >
              {pricing.text}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
