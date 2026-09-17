'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@/lib/theme';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

const REQUIRED_ENV_KEYS = [
  'PUBLIC_GISCUS_REPO',
  'PUBLIC_GISCUS_REPO_ID',
  'PUBLIC_GISCUS_CATEGORY',
  'PUBLIC_GISCUS_CATEGORY_ID',
] as const;

function getMissingEnvKeys(config: Record<string, string | undefined>) {
  return REQUIRED_ENV_KEYS.filter((key) => !config[key]);
}

export function GiscusComments({ locale }: { locale: Locale }) {
  const labels = getDictionary(locale).comments;
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const config = useMemo(
    () => ({
      PUBLIC_GISCUS_REPO: import.meta.env.PUBLIC_GISCUS_REPO,
      PUBLIC_GISCUS_REPO_ID: import.meta.env.PUBLIC_GISCUS_REPO_ID,
      PUBLIC_GISCUS_CATEGORY: import.meta.env.PUBLIC_GISCUS_CATEGORY,
      PUBLIC_GISCUS_CATEGORY_ID: import.meta.env.PUBLIC_GISCUS_CATEGORY_ID,
      PUBLIC_GISCUS_MAPPING: import.meta.env.PUBLIC_GISCUS_MAPPING ?? 'pathname',
      PUBLIC_GISCUS_STRICT: import.meta.env.PUBLIC_GISCUS_STRICT ?? '0',
      PUBLIC_GISCUS_REACTIONS_ENABLED: import.meta.env.PUBLIC_GISCUS_REACTIONS_ENABLED ?? '1',
      PUBLIC_GISCUS_INPUT_POSITION: import.meta.env.PUBLIC_GISCUS_INPUT_POSITION ?? 'bottom',
      PUBLIC_GISCUS_LANG: import.meta.env.PUBLIC_GISCUS_LANG ?? 'zh-TW',
      PUBLIC_GISCUS_THEME_LIGHT: import.meta.env.PUBLIC_GISCUS_THEME_LIGHT ?? 'light',
      PUBLIC_GISCUS_THEME_DARK: import.meta.env.PUBLIC_GISCUS_THEME_DARK ?? 'dark_dimmed',
    }),
    []
  );

  const missingEnvKeys = getMissingEnvKeys(config);
  const theme =
    resolvedTheme === 'dark'
      ? config.PUBLIC_GISCUS_THEME_DARK
      : config.PUBLIC_GISCUS_THEME_LIGHT;
  const initializedRef = useRef(false);

  // Mount giscus exactly once; later theme changes only post a config
  // message to the live iframe instead of re-inserting the script (which
  // would reload the whole thread).
  useEffect(() => {
    if (!ref.current || missingEnvKeys.length > 0) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.setAttribute('data-repo', config.PUBLIC_GISCUS_REPO!);
    script.setAttribute('data-repo-id', config.PUBLIC_GISCUS_REPO_ID!);
    script.setAttribute('data-category', config.PUBLIC_GISCUS_CATEGORY!);
    script.setAttribute('data-category-id', config.PUBLIC_GISCUS_CATEGORY_ID!);
    script.setAttribute('data-mapping', config.PUBLIC_GISCUS_MAPPING);
    script.setAttribute('data-strict', config.PUBLIC_GISCUS_STRICT);
    script.setAttribute('data-reactions-enabled', config.PUBLIC_GISCUS_REACTIONS_ENABLED);
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', config.PUBLIC_GISCUS_INPUT_POSITION);
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', config.PUBLIC_GISCUS_LANG);
    script.setAttribute('data-loading', 'lazy');

    ref.current.appendChild(script);
    // `theme` is intentionally excluded: it only seeds the initial
    // data-theme; later changes flow through the postMessage effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, missingEnvKeys.length]);

  // Keep the loaded thread in sync with the active theme without remounting.
  useEffect(() => {
    if (!initializedRef.current || !ref.current) return;
    const iframe = ref.current.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme } } },
      'https://giscus.app'
    );
  }, [theme]);

  if (missingEnvKeys.length > 0) {
    if (import.meta.env.DEV) {
      return (
        <section className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50/70 p-6 text-sm text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-200">
          {labels.setup(missingEnvKeys.join(', '))}
        </section>
      );
    }
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
      <h2 className="type-subtitle font-semibold text-slate-900 dark:text-slate-50">{labels.title}</h2>
      <div ref={ref} />
    </section>
  );
}
