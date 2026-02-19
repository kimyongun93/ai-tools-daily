'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 이미 설치된 경우 표시하지 않음
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // 사용자가 이전에 닫은 경우 7일간 표시하지 않음
    const dismissed = localStorage.getItem('install-dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // iOS 감지
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    if (isiOS) {
      // iOS는 beforeinstallprompt를 지원하지 않으므로 바로 배너 표시
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Chrome: beforeinstallprompt 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('install-dismissed', String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="install-prompt fixed bottom-16 md:bottom-4 left-4 right-4 z-[60] mx-auto max-w-3xl">
      <div
        className="rounded-2xl border p-4 shadow-lg backdrop-blur-md"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'color-mix(in srgb, var(--surface) 90%, transparent)',
        }}
      >
        {showIOSGuide ? (
          /* iOS 설치 가이드 */
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">홈 화면에 추가하기</h3>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-[var(--surface2)]"
                aria-label="닫기"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ol className="text-xs space-y-2" style={{ color: 'var(--text-dim)' }}>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>1</span>
                <span>하단의 <strong style={{ color: 'var(--text)' }}>공유 버튼</strong>
                  <svg className="inline mx-0.5 -mt-0.5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  을 탭하세요</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>2</span>
                <span>아래로 스크롤하여 <strong style={{ color: 'var(--text)' }}>홈 화면에 추가</strong>를 탭하세요</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>3</span>
                <span>오른쪽 상단의 <strong style={{ color: 'var(--text)' }}>추가</strong>를 탭하면 완료!</span>
              </li>
            </ol>
          </div>
        ) : (
          /* 기본 설치 배너 */
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">앱으로 설치하기</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                홈 화면에 추가하면 더 빠르게 접근할 수 있어요
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[var(--surface2)]"
                style={{ color: 'var(--text-dim)' }}
              >
                나중에
              </button>
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                설치
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
