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
 * attribute="class" defaultTheme="system" enableSystem), and re-applies it
 * on every ClientRouter navigation — Astro's swap replaces the <html>
 * element's attributes, wiping the runtime `dark` class/data-theme, so
 * without the `astro:after-swap` re-apply every internal navigation would
 * flash light mode before islands hydrate.
 */
export const THEME_INIT_SNIPPET = `<script>
(function(){function apply(){try{var k='theme';var v=localStorage.getItem(k);if(v!=='light'&&v!=='dark')v=null;var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=v??(d?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.theme=t;}catch(e){}}apply();document.addEventListener('astro:after-swap',apply);})();
</script>`;

/**
 * Islands are separate React roots, so a shared provider cannot span them.
 * Theme state therefore lives on the document: the init snippet (or
 * setTheme) applies the class, and this hook re-syncs from a custom event
 * (same-tab toggles from ANY island), the storage event (cross-tab), and
 * system scheme changes. Every sync path re-applies the document theme:
 * cross-tab writes and OS scheme flips must recolor the page, and the
 * detail payload must win over a storage re-read because storage writes
 * can fail (private mode) after the preference was already applied.
 */
export function useTheme(): {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (preference: ThemePreference) => void;
} {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | undefined>(undefined);

  useEffect(() => {
    const sync = (event?: Event) => {
      const preference =
        event instanceof CustomEvent && (event.detail === 'light' || event.detail === 'dark' || event.detail === 'system')
          ? event.detail
          : getStoredTheme();
      setThemeState(preference);
      setResolvedTheme(applyTheme(preference));
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
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: preference }));
  }, []);

  return { theme, resolvedTheme, setTheme };
}
