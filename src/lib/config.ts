// PLACEHOLDER (Task 3 of the Astro migration): minimal siteConfig so the
// verbatim port of lib/locales.ts type-checks and builds. Task 4 replaces
// this file wholesale with the full port of lib/config.ts.
export const siteConfig = {
  url: process.env.PUBLIC_SITE_URL || 'https://blog.gbanyan.net',
  defaultLocale: process.env.PUBLIC_DEFAULT_LOCALE === 'en' ? 'en' : 'zh-TW',
};