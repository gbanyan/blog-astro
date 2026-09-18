'use client';

import {
  DEFAULT_LOCALE,
  ENGLISH_LOCALE,
  getLocaleFromPathname,
  resolveLocaleSwitchTarget,
  type LocaleRouteManifest,
} from '@/lib/locale-switcher';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const LOCALE_LABELS = {
  [DEFAULT_LOCALE]: '中',
  [ENGLISH_LOCALE]: 'EN',
} as const;

interface LanguageSwitcherProps {
  /** Optional generated route-pair manifest for translated detail pages. */
  manifest?: LocaleRouteManifest;
  /** `Astro.url.pathname`, passed by the `.astro` host (replaces `usePathname`). */
  currentPath: string;
  /** Dictionary `language` section, passed by the `.astro` host. */
  labels: Dictionary['language'];
}

export function LanguageSwitcher({ manifest, currentPath, labels }: LanguageSwitcherProps) {
  const currentLocale = getLocaleFromPathname(currentPath);
  const targetLocale = currentLocale === DEFAULT_LOCALE ? ENGLISH_LOCALE : DEFAULT_LOCALE;
  const target = resolveLocaleSwitchTarget(currentPath, targetLocale, manifest);
  const targetLabel = targetLocale === ENGLISH_LOCALE ? labels.english : labels.traditionalChinese;
  const fallbackHint = target.isFallback ? ` (${labels.fallback.replace('{lang}', targetLabel)})` : '';
  const switchLabel = `${labels.switchTo.replace('{lang}', targetLabel)} (${LOCALE_LABELS[targetLocale]})${fallbackHint}`;

  return (
    <a
      href={target.href}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/40 px-2.5 text-xs font-semibold tracking-[0.12em] text-slate-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-accent/60 dark:hover:bg-slate-800 dark:hover:text-accent"
      aria-label={switchLabel}
      title={switchLabel}
    >
      <span aria-hidden="true">{LOCALE_LABELS[targetLocale]}</span>
    </a>
  );
}
