import {
  defaultLocale as seedDefaultLocale,
  isLocale,
  locales as seedLocales,
} from './i18n/config.ts';
import { siteConfig } from './config.ts';

export { isLocale } from './i18n/config.ts';

export const SUPPORTED_LOCALES = seedLocales;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(
  siteConfig.defaultLocale as Locale
)
  ? (siteConfig.defaultLocale as Locale)
  : seedDefaultLocale;

export function normalizeLocale(value: string | undefined): Locale | undefined {
  if (isLocale(value)) return value;
  if (value?.toLowerCase() === 'zh-tw') return 'zh-TW';
  return value?.toLowerCase() === 'en' ? 'en' : undefined;
}

/**
 * The default locale keeps the existing public paths. Secondary locales use a
 * prefix so the routing lane can add a locale segment without changing the
 * content adapter's source-relative slug contract.
 */
export function localizedPath(path: string, locale: Locale): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const withoutLocalePrefix = normalizedPath.replace(/^\/(?:zh-TW|en)(?=\/|$)/, '');
  const basePath = withoutLocalePrefix || '/';

  return locale === DEFAULT_LOCALE
    ? basePath
    : `/${locale}${basePath === '/' ? '' : basePath}`;
}

/** A record's route in `locale` (its own locale by default). */
export function documentPath(
  document: { url: string; locale: Locale },
  locale: Locale = document.locale
): string {
  return localizedPath(document.url, locale);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

export function localeToOpenGraph(locale: Locale): string {
  return locale === 'zh-TW' ? 'zh_TW' : 'en_US';
}

export function localeToRss(locale: Locale): string {
  return locale === 'zh-TW' ? 'zh-TW' : 'en';
}

export function localizedEndpoint(path: string, locale: Locale): string {
  return absoluteUrl(localizedPath(path, locale));
}
