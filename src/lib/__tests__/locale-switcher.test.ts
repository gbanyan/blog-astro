import { describe, expect, it } from 'vitest';
import {
  ENGLISH_LOCALE,
  getLocaleFromPathname,
  LOCALE_ROUTE_MANIFEST,
  resolveLocaleSwitchTarget,
  type LocaleRouteManifest,
} from '@/lib/locale-switcher';

const DETAIL_MANIFEST: LocaleRouteManifest = {
  ...LOCALE_ROUTE_MANIFEST,
  '/pages/about': { defaultPath: '/pages/about', en: '/en/pages/about' },
};

describe('resolveLocaleSwitchTarget', () => {
  it('maps section pages to their English section', () => {
    const target = resolveLocaleSwitchTarget('/blog', ENGLISH_LOCALE);
    expect(target).toEqual({ href: '/en/blog', locale: 'en', isFallback: false });
  });

  it('falls back to the section for unmapped detail routes', () => {
    const target = resolveLocaleSwitchTarget('/blog/some-slug', ENGLISH_LOCALE);
    expect(target).toEqual({ href: '/en/blog', locale: 'en', isFallback: true });
  });

  it('resolves mapped detail routes without a fallback flag', () => {
    const target = resolveLocaleSwitchTarget('/pages/about', ENGLISH_LOCALE, DETAIL_MANIFEST);
    expect(target).toEqual({
      href: '/en/pages/about',
      locale: 'en',
      isFallback: false,
    });
  });

  it('resolves en detail routes back to the default locale', () => {
    const target = resolveLocaleSwitchTarget('/en/pages/about', 'zh-TW', DETAIL_MANIFEST);
    expect(target).toEqual({ href: '/pages/about', locale: 'zh-TW', isFallback: false });
  });

  it('keeps the home route paired', () => {
    expect(resolveLocaleSwitchTarget('/', ENGLISH_LOCALE)).toEqual({
      href: '/en',
      locale: 'en',
      isFallback: false,
    });
  });
});

describe('getLocaleFromPathname', () => {
  it('detects the English prefix', () => {
    expect(getLocaleFromPathname('/en')).toBe(ENGLISH_LOCALE);
    expect(getLocaleFromPathname('/en/blog/x')).toBe(ENGLISH_LOCALE);
  });

  it('defaults to the unprefixed locale', () => {
    expect(getLocaleFromPathname('/')).toBe('zh-TW');
    expect(getLocaleFromPathname('/blog/x')).toBe('zh-TW');
  });
});
