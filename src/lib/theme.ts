import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
export const THEME_CHANGE_EVENT = 'omp-theme-change';

export function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : preference;
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

/**
 * Inline script for the layout <head>: applies the stored/system theme
 * before first paint (class strategy, same contract as next-themes
 * attribute="class" defaultTheme="system" enableSystem).
 */
export const THEME_INIT_SNIPPET = `<script>
(function(){try{var k='${STORAGE_KEY}';var v=localStorage.getItem(k);if(v!=='light'&&v!=='dark')v=null;var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=v??(d?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.theme=t;}catch(e){}})();
</script>`;

/**
 * Islands are separate React roots, so a shared provider cannot span them.
 * Theme state therefore lives on the document: the init snippet (or
 * setTheme) applies the class, and this hook re-syncs from a custom event
 * (same-tab toggles from ANY island), the storage event (cross-tab), and
 * system scheme changes.
 */
export function useTheme(): {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (preference: ThemePreference) => void;
} {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | undefined>(undefined);

  useEffect(() => {
    const sync = () => {
      const preference = getStoredTheme();
      setThemeState(preference);
      setResolvedTheme(resolveTheme(preference));
    };
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', sync);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
      media.removeEventListener('change', sync);
    };
  }, []);

  const setTheme = useCallback((preference: ThemePreference) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Private-mode storage failures still apply the theme for the session.
    }
    applyTheme(preference);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return { theme, resolvedTheme, setTheme };
}
