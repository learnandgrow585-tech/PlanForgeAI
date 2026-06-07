'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch — render a stable placeholder until mounted
  const isDark = mounted ? resolvedTheme === 'dark' : true;

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
    >
      <span className="text-sm">{isDark ? '🌙' : '☀️'}</span>
      {isDark ? 'Dark' : 'Light'}
    </button>
  );
}
