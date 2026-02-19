'use client';

import { useState, useEffect, useCallback } from 'react';

interface StatusData {
  total_tools: number;
  today_tools: number;
  active_push_subscriptions: number;
  last_agent_run: {
    id: string;
    source: string;
    status: string;
    tools_found: number;
    tools_saved: number;
    created_at: string;
  } | null;
  recent_runs: Array<{
    id: string;
    source: string;
    status: string;
    tools_found: number;
    tools_saved: number;
    created_at: string;
    details: Record<string, unknown>;
  }>;
}

export default function AdminPage() {
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLog, setActionLog] = useState<string[]>([]);

  // 저장된 API 키 복원
  useEffect(() => {
    const saved = localStorage.getItem('admin-api-key');
    if (saved) {
      setApiKey(saved);
      setIsAuthenticated(true);
    }
  }, []);

  const addLog = (msg: string) => {
    setActionLog((prev) => [`[${new Date().toLocaleTimeString('ko-KR')}] ${msg}`, ...prev].slice(0, 50));
  };

  const fetchStatus = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/status', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setIsAuthenticated(true);
      localStorage.setItem('admin-api-key', apiKey);
      addLog('상태 조회 완료');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      setError(`상태 조회 실패: ${msg}`);
      if (msg.includes('401')) setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // 인증 후 자동 조회
  useEffect(() => {
    if (isAuthenticated && apiKey) fetchStatus();
  }, [isAuthenticated, apiKey, fetchStatus]);

  // 수동 수집 트리거
  const triggerCollect = async () => {
    addLog('수집 트리거 시작...');
    try {
      const res = await fetch('/api/cron/collect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      addLog(`수집 완료: ${JSON.stringify(data)}`);
      setTimeout(fetchStatus, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류';
      addLog(`수집 실패: ${msg}`);
    }
  };

  // ISR 캐시 갱신
  const triggerRevalidate = async () => {
    addLog('캐시 갱신 시작...');
    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-token': apiKey,
        },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      addLog(`캐시 갱신: ${JSON.stringify(data)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류';
      addLog(`캐시 갱신 실패: ${msg}`);
    }
  };

  // 로그인 화면
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>
          🔐 Admin 로그인
        </h1>
        <input
          type="password"
          placeholder="Admin API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchStatus()}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
            color: 'var(--text)', fontSize: 14, marginBottom: 12,
          }}
        />
        <button
          onClick={fetchStatus}
          disabled={loading || !apiKey}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 8,
            backgroundColor: 'var(--accent)', color: '#fff',
            fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 14,
          }}
        >
          {loading ? '확인 중...' : '로그인'}
        </button>
        {error && <p style={{ color: '#ef4444', marginTop: 12, fontSize: 13 }}>{error}</p>}
      </div>
    );
  }

  // 대시보드
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>📊 Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchStatus} disabled={loading} style={btnStyle('#6b7280')}>
            {loading ? '⏳' : '🔄'} 새로고침
          </button>
          <button onClick={() => { localStorage.removeItem('admin-api-key'); setIsAuthenticated(false); }} style={btnStyle('#ef4444')}>
            로그아웃
          </button>
        </div>
      </div>

      {error && <div style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, color: '#991b1b', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* 통계 카드 */}
      {status && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="전체 도구" value={status.total_tools} icon="📦" />
            <StatCard label="오늘 수집" value={status.today_tools} icon="🆕" />
            <StatCard label="푸시 구독자" value={status.active_push_subscriptions} icon="🔔" />
            <StatCard
              label="마지막 실행"
              value={status.last_agent_run ? timeAgo(status.last_agent_run.created_at) : '-'}
              icon="⏰"
            />
          </div>

          {/* 마지막 실행 상세 */}
          {status.last_agent_run && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-dim)' }}>마지막 에이전트 실행</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div>소스: <strong>{status.last_agent_run.source}</strong></div>
                <div>상태: <StatusBadge status={status.last_agent_run.status} /></div>
                <div>발견: <strong>{status.last_agent_run.tools_found}</strong>개</div>
                <div>저장: <strong>{status.last_agent_run.tools_saved}</strong>개</div>
              </div>
            </div>
          )}

          {/* 최근 실행 이력 */}
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-dim)' }}>최근 실행 이력</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}>시간</th>
                    <th style={thStyle}>소스</th>
                    <th style={thStyle}>상태</th>
                    <th style={thStyle}>발견</th>
                    <th style={thStyle}>저장</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recent_runs.map((run) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={tdStyle}>{new Date(run.created_at).toLocaleString('ko-KR')}</td>
                      <td style={tdStyle}>{run.source}</td>
                      <td style={tdStyle}><StatusBadge status={run.status} /></td>
                      <td style={tdStyle}>{run.tools_found}</td>
                      <td style={tdStyle}>{run.tools_saved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 액션 버튼 */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-dim)' }}>수동 작업</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={triggerCollect} style={btnStyle('#4f8ff7')}>🚀 수집 실행</button>
          <button onClick={triggerRevalidate} style={btnStyle('#10b981')}>♻️ 캐시 갱신</button>
        </div>
      </div>

      {/* 액션 로그 */}
      {actionLog.length > 0 && (
        <div style={{ ...cardStyle }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-dim)' }}>실행 로그</h3>
          <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-dim)' }}>
            {actionLog.map((log, i) => (
              <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid var(--border)' }}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 헬퍼 컴포넌트 + 스타일 ----

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      backgroundColor: `${color}20`, color, fontSize: 11, fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

const cardStyle: React.CSSProperties = {
  padding: 16, borderRadius: 12,
  border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
};

const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: 'none',
  backgroundColor: bg, color: '#fff', fontSize: 13,
  fontWeight: 600, cursor: 'pointer',
});

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', color: 'var(--text-dim)', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '6px 8px', color: 'var(--text)' };
