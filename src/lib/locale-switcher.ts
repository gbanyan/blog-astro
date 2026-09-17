/**
 * Locale switching stays separate from route generation so the header does
 * not need to know how translated content is stored.
 *
 * Integration contract:
 * - Keep keys in this manifest canonical (zh-TW) paths, without a locale
 *   prefix, e.g. `/blog/my-post` and `/tags/medicine`.
 * - Add an `en` value only when the corresponding English route exists.
 * - Pass the same manifest to `resolveLocaleSwitchTarget` from a future
 *   locale-aware route/content layer. Missing entries intentionally resolve
 *   to a section or homepage fallback instead of a dead link.
 */

import { DEFAULT_LOCALE, type Locale } from './locales';

export { DEFAULT_LOCALE };
export const ENGLISH_LOCALE = 'en' as const;

export type SupportedLocale = Locale;

export interface LocaleRoutePair {
  /** Canonical zh-TW route. The key is normally enough, but this is useful
   * when a translated slug differs from the default-locale slug. */
  defaultPath: string;
  en?: string;
}

export type LocaleRouteManifest = Record<string, LocaleRoutePair>;

export interface LocaleSwitchTarget {
  href: string;
  locale: SupportedLocale;
  isFallback: boolean;
}

/**
 * Route-level pairs are safe even before translated detail content is wired.
 * Detail routes should be added by the locale/content integration layer.
 */
export const LOCALE_ROUTE_MANIFEST: LocaleRouteManifest = {
  '/': { defaultPath: '/' },
  '/blog': { defaultPath: '/blog' },
  '/tags': { defaultPath: '/tags' },
  '/projects': { defaultPath: '/projects' },
};

const SECTION_FALLBACKS: Record<string, string> = {
  '/blog': '/blog',
  '/pages': '/',
  '/tags': '/tags',
  '/projects': '/projects',
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const withoutTrailingSlash = path.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

function stripLocalePrefix(pathname: string): string {
  const normalized = normalizePath(pathname);
  for (const locale of [DEFAULT_LOCALE, ENGLISH_LOCALE]) {
    const prefix = `/${locale}`;
    if (normalized === prefix) return '/';
    if (normalized.startsWith(`${prefix}/`)) {
      return normalized.slice(prefix.length) || '/';
    }
  }
  return normalized;
}

function getSectionPath(pathname: string): string {
  const firstSegment = `/${pathname.split('/')[1]}`;
  return SECTION_FALLBACKS[firstSegment] ?? '/';
}

function getManifestPair(
  canonicalPath: string,
  manifest: LocaleRouteManifest,
): LocaleRoutePair | undefined {
  const pair = manifest[canonicalPath];
  if (pair && normalizePath(pair.defaultPath) === canonicalPath) return pair;

  // English slugs may differ, so resolve the reverse lookup when the current
  // pathname came from an English route.
  return Object.values(manifest).find(
    (candidate) => candidate.en && stripLocalePrefix(candidate.en) === canonicalPath,
  );
}

/**
 * Resolve an explicit language link for the current pathname.
 *
 * This function never redirects or mutates navigation state; it only returns
 * the href that a visible, user-activated link should use.
 */
export function resolveLocaleSwitchTarget(
  pathname: string,
  targetLocale: SupportedLocale,
  manifest: LocaleRouteManifest = LOCALE_ROUTE_MANIFEST,
): LocaleSwitchTarget {
  const canonicalPath = stripLocalePrefix(pathname);
  const pair = getManifestPair(canonicalPath, manifest);

  if (targetLocale === DEFAULT_LOCALE) {
    if (pair) {
      return {
        href: normalizePath(pair.defaultPath),
        locale: DEFAULT_LOCALE,
        isFallback: false,
      };
    }

    const sectionPath = getSectionPath(canonicalPath);
    return {
      href: sectionPath,
      locale: DEFAULT_LOCALE,
      isFallback: canonicalPath !== sectionPath,
    };
  }

  if (pair?.en) {
    return {
      href: normalizePath(pair.en),
      locale: ENGLISH_LOCALE,
      isFallback: false,
    };
  }

  const sectionPath = getSectionPath(canonicalPath);
  const sectionPair = getManifestPair(sectionPath, manifest);
  const fallbackPath = sectionPair?.en ?? (sectionPath === '/' ? '/en' : `/en${sectionPath}`);

  return {
    href: normalizePath(fallbackPath),
    locale: ENGLISH_LOCALE,
    isFallback: canonicalPath !== sectionPath,
  };
}

export function getLocaleFromPathname(pathname: string): SupportedLocale {
  return normalizePath(pathname) === '/en' || normalizePath(pathname).startsWith('/en/')
    ? ENGLISH_LOCALE
    : DEFAULT_LOCALE;
}
