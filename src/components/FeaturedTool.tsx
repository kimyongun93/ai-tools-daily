import type { ToolWithCategory } from '@/types';
import { BookmarkButton } from './BookmarkButton';
import { ShareButton } from './ShareButton';

export function FeaturedTool({ tool }: { tool: ToolWithCategory }) {
  return (
    <div
      className="rounded-xl border overflow-hidden transition-all hover:shadow-lg"
      style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--surface)' }}
    >
      {/* 스크린샷 영역 */}
      {tool.screenshot_url && (
        <a href={`/tool/${tool.slug}`} className="block aspect-video bg-gray-900 overflow-hidden">
          <img src={tool.screenshot_url} alt={tool.name} className="w-full h-full object-cover" />
        </a>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <a href={`/tool/${tool.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 overflow-hidden"
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
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg leading-tight truncate">{tool.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {tool.category && (
                  <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-dim)' }}>
                    {tool.category.icon} {tool.category.name}
                  </span>
                )}
                {tool.score && (
                  <span className="text-[11px] sm:text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                    ★ {tool.score}
                  </span>
                )}
              </div>
            </div>
          </a>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <BookmarkButton toolId={tool.id} size="md" />
            <ShareButton title={tool.name} url={`/tool/${tool.slug}`} size="md" />
          </div>
        </div>

        <a href={`/tool/${tool.slug}`}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            {tool.summary_ko || tool.description_en}
          </p>
        </a>

        {tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tool.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--text-dim)' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
