'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    setTheme(next[theme]);
  };

  const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥️';

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-sm"
      aria-label={`테마: ${theme}`}
      title={`현재: ${theme === 'system' ? '시스템' : theme === 'dark' ? '다크' : '라이트'}`}
    >
      {icon}
    </button>
  );
}
