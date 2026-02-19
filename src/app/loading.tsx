export default function Loading() {
  return (
    <div className="pb-20 md:pb-6">
      {/* 헤더 스켈레톤 */}
      <div className="mb-6 animate-pulse">
        <div className="h-7 rounded w-48 mb-2" style={{ backgroundColor: 'var(--surface2)' }} />
        <div className="h-4 rounded w-72" style={{ backgroundColor: 'var(--surface2)' }} />
      </div>

      {/* 추천 카드 스켈레톤 */}
      <div
        className="rounded-xl border p-5 mb-8 animate-pulse"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl" style={{ backgroundColor: 'var(--surface2)' }} />
          <div className="space-y-2 flex-1">
            <div className="h-5 rounded w-32" style={{ backgroundColor: 'var(--surface2)' }} />
            <div className="h-3 rounded w-24" style={{ backgroundColor: 'var(--surface2)' }} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded w-full" style={{ backgroundColor: 'var(--surface2)' }} />
          <div className="h-3 rounded w-4/5" style={{ backgroundColor: 'var(--surface2)' }} />
        </div>
      </div>

      {/* 목록 스켈레톤 */}
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border p-4 animate-pulse"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
          >
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded w-1/3" style={{ backgroundColor: 'var(--surface2)' }} />
                <div className="h-3 rounded w-2/3" style={{ backgroundColor: 'var(--surface2)' }} />
                <div className="flex gap-2">
                  <div className="h-4 rounded w-16" style={{ backgroundColor: 'var(--surface2)' }} />
                  <div className="h-4 rounded w-12" style={{ backgroundColor: 'var(--surface2)' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
