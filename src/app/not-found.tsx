export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-bold mb-2">페이지를 찾을 수 없습니다</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <a
        href="/"
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        홈으로 돌아가기
      </a>
    </div>
  );
}
