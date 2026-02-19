'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // 이미 설치된 경우 표시하지 않음
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // 사용자가 이전에 닫은 경우 3일간 표시하지 않음
    const dismissed = localStorage.getItem('install-dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

    // iOS 감지
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    if (isiOS) {
      // iOS Safari에서만 표시 (다른 브라우저에서는 불필요)
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
      if (isSafari) {
        setTimeout(() => setShowBanner(true), 2000);
      }
      return;
    }

    // Android/Chrome: beforeinstallprompt 이벤트 캡처
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 앱이 설치되면 배너 숨기기
    const appInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', appInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
    } catch {
      // prompt already used
    }
    setDeferredPrompt(null);
  }, [isIOS, deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setShowBanner(false);
      setShowIOSGuide(false);
      setIsClosing(false);
      localStorage.setItem('install-dismissed', String(Date.now()));
    }, 250);
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className="install-prompt fixed left-3 right-3 z-[60] mx-auto max-w-3xl"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
        animation: isClosing ? 'slideDown 0.25s ease forwards' : 'slideUp 0.3s ease',
      }}
    >
      <div
        className="rounded-2xl border p-4 shadow-lg"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {showIOSGuide ? (
          /* iOS 설치 가이드 */
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">홈 화면에 추가하기</h3>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-[var(--surface2)] active:bg-[var(--surface2)]"
                aria-label="닫기"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ol className="text-xs space-y-2.5" style={{ color: 'var(--text-dim)' }}>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>1</span>
                <span>
                  하단의{' '}
                  <strong style={{ color: 'var(--text)' }}>
                    공유 버튼{' '}
                    <svg className="inline -mt-0.5" width="14" height="14" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  </strong>
                  을 탭하세요
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>2</span>
                <span>스크롤하여 <strong style={{ color: 'var(--text)' }}>홈 화면에 추가</strong>를 탭하세요</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>3</span>
                <span>오른쪽 상단의 <strong style={{ color: 'var(--text)' }}>추가</strong>를 탭하면 완료!</span>
              </li>
            </ol>
          </div>
        ) : (
          /* 기본 설치 배너 */
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[13px] leading-tight">앱으로 설치하기</h3>
              <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-dim)' }}>
                홈 화면에서 바로 실행할 수 있어요
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-xs font-medium active:bg-[var(--surface2)]"
                style={{ color: 'var(--text-dim)' }}
              >
                닫기
              </button>
              <button
                onClick={handleInstall}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white active:opacity-80"
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
