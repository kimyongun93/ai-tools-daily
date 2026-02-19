import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PushToggle } from '@/components/PushToggle';
import { InstallPrompt } from '@/components/InstallPrompt';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "AI Tools Daily — 매일 새로운 AI 툴",
    template: "%s | AI Tools Daily",
  },
  description: "매일 아침 7시, 새로 출시된 AI 툴을 큐레이션하여 전달합니다.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Daily",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "AI Tools Daily",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* 초기 테마 깜빡임 방지 (FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ai-daily-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <ThemeProvider>
          {/* 상단 내비게이션 */}
          <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}>
            <nav className="mx-auto max-w-3xl flex items-center justify-between px-4 h-14">
              <a href="/" className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                ⚡ AI Daily
              </a>
              <div className="flex items-center gap-1">
                <PushToggle />
                <a href="/search" className="p-2 rounded-lg hover:bg-[var(--surface)]" aria-label="검색">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </a>
                <a href="/bookmarks" className="p-2 rounded-lg hover:bg-[var(--surface)]" aria-label="북마크">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                </a>
                <ThemeToggle />
              </div>
            </nav>
          </header>

          {/* 메인 콘텐츠 */}
          <main className="mx-auto max-w-3xl px-4 py-6">
            {children}
          </main>

          {/* 하단 네비게이션 (모바일) */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
            <div className="mx-auto max-w-3xl flex justify-around py-2">
              <a href="/" className="flex flex-col items-center gap-0.5 text-xs py-1 px-3" style={{ color: 'var(--accent)' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                홈
              </a>
              <a href="/search" className="flex flex-col items-center gap-0.5 text-xs py-1 px-3" style={{ color: 'var(--text-dim)' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                검색
              </a>
              <a href="/categories" className="flex flex-col items-center gap-0.5 text-xs py-1 px-3" style={{ color: 'var(--text-dim)' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                카테고리
              </a>
              <a href="/bookmarks" className="flex flex-col items-center gap-0.5 text-xs py-1 px-3" style={{ color: 'var(--text-dim)' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                북마크
              </a>
            </div>
          </nav>

          {/* PWA 설치 프롬프트 */}
          <InstallPrompt />

          {/* Service Worker 등록 */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
