import {
  defaultLocale as fallbackLocale,
  isLocale,
  type Locale,
} from './i18n/config.ts';

// Vite statically replaces `import.meta.env` at build time; plain-Node
// consumers of this module (the i18n verification scripts) see `undefined`,
// so fall back to an empty object and let the defaults below apply.
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

export const siteConfig = {
  name: env.PUBLIC_SITE_NAME || 'Your Name',
  title: env.PUBLIC_SITE_TITLE || 'Your Personal Site',
  description: env.PUBLIC_SITE_DESCRIPTION || 'Personal homepage and blog.',
  url: env.PUBLIC_SITE_URL || 'https://blog.gbanyan.net',
  author: env.PUBLIC_SITE_AUTHOR || 'Your Name',
  tagline: env.PUBLIC_SITE_TAGLINE || '個人首頁與技術筆記',
  postsPerPage: Number(env.PUBLIC_POSTS_PER_PAGE) > 0 ? Number(env.PUBLIC_POSTS_PER_PAGE) : 5,
  defaultLocale: (isLocale(env.PUBLIC_DEFAULT_LOCALE)
    ? env.PUBLIC_DEFAULT_LOCALE
    : fallbackLocale) as Locale,
  avatar: env.PUBLIC_SITE_AVATAR_URL || '',
  aboutShort: env.PUBLIC_SITE_ABOUT_SHORT || '醫師／寫作／技術分享',
  social: {
    twitter: env.PUBLIC_TWITTER_HANDLE || '',
    github: env.PUBLIC_GITHUB_URL || '',
    linkedin: env.PUBLIC_LINKEDIN_URL || '',
    email: env.PUBLIC_EMAIL_CONTACT || '',
    mastodon: env.PUBLIC_MASTODON_URL || '',
    gitea: env.PUBLIC_GITEA_URL || ''
  },
  theme: {
    accent: env.PUBLIC_COLOR_ACCENT || '#7c3aed',
    accentSoft: env.PUBLIC_COLOR_ACCENT_SOFT || '#f3e8ff',
    accentTextLight: env.PUBLIC_COLOR_ACCENT_TEXT_LIGHT || '#6d28d9',
    accentTextDark: env.PUBLIC_COLOR_ACCENT_TEXT_DARK || '#c4b5fd'
  },
  ogImage: env.PUBLIC_OG_DEFAULT_IMAGE || '/assets/og-default.png',
  twitterCard:
    (env.PUBLIC_TWITTER_CARD_TYPE as 'summary' | 'summary_large_image' | undefined) ||
    'summary_large_image',
};