'use client';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-xl font-bold mb-2">문제가 발생했습니다</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
        일시적인 오류입니다. 잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        다시 시도
      </button>
    </div>
  );
}
