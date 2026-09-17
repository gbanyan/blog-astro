'use client';

import { FiMoon, FiSun } from 'react-icons/fi';
import { useMounted } from '@/lib/use-mounted';
import { useTheme } from '@/lib/theme';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function ThemeToggle({ labels }: { labels: Pick<Dictionary['common'], 'switchToLight' | 'switchToDark'> }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';
  const next = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-accent-textLight transition-all duration-300 ease-out-quarter hover:-translate-y-1 hover:scale-110 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:text-accent-textDark dark:hover:bg-accent-soft dark:hover:text-accent"
      onClick={() => setTheme(next)}
      aria-label={isDark ? labels.switchToLight : labels.switchToDark}
    >
      {isDark ? (
        <FiSun className="h-4 w-4 rotate-0 text-amber-400 transition-all duration-500 ease-out-expo" />
      ) : (
        <FiMoon className="h-4 w-4 rotate-180 text-blue-500 transition-all duration-500 ease-out-expo" />
      )}
    </button>
  );
}
