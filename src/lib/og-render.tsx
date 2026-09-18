import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';

import { siteConfig } from '@/lib/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Locale } from '@/lib/locales';

// The endpoint executes only during the build from the project root; the
// bundler rewrites import.meta-relative paths into dist chunks, so resolve
// fonts from cwd instead.
const FONT_DIR = path.join(process.cwd(), 'src', 'lib', 'og-fonts');

const FONT_FILES = {
  regular: path.join(FONT_DIR, 'noto-400.woff'),
  bold: path.join(FONT_DIR, 'noto-700.woff'),
};

let fontCache: { regular: Buffer; bold: Buffer } | null = null;

function loadFonts() {
  if (!fontCache) {
    fontCache = {
      regular: readFileSync(FONT_FILES.regular),
      bold: readFileSync(FONT_FILES.bold),
    };
  }
  return fontCache;
}

export interface OgCardInput {
  locale: Locale;
  title: string;
  description?: string;
  tags?: string[];
  author?: string;
  date?: string | Date;
}

const pill = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#1e293b',
  color: '#94a3b8',
  padding: '8px 20px',
  borderRadius: '20px',
  fontSize: '20px',
  border: '1px solid #334155',
} as const;

/**
 * Port of blog-nextjs app/api/og/route.tsx card markup (satori JSX, same
 * layout: gradient header rule, clamped title/description, author·date line,
 * tag pills, gradient footer with host name) rendered to PNG at build time.
 */
export async function renderOgCard(input: OgCardInput): Promise<Buffer> {
  const { locale, title, description, tags = [], author, date } = input;
  const brandTitle = isLocale(locale)
    ? getDictionary(locale).brand.title
    : 'Personal blog';

  const displayDate = date
    ? new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const metaText = [author, displayDate].filter(Boolean).join(' · ');

  const { regular, bold } = loadFonts();

  const tree = {
    type: 'div',
    props: {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        fontFamily: '"Noto Sans TC", sans-serif',
        backgroundColor: '#0f172a',
        backgroundImage:
          'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)',
        backgroundSize: '100px 100px',
        padding: '80px',
      },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', gap: '20px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      width: '8px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                      borderRadius: '4px',
                    },
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '32px',
                      fontWeight: 600,
                      color: '#f8fafc',
                      letterSpacing: '-0.02em',
                    },
                    children: brandTitle,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                maxWidth: '900px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '72px',
                      fontWeight: 700,
                      color: '#f8fafc',
                      lineHeight: 1.1,
                      letterSpacing: '-0.03em',
                      lineClamp: 2,
                    },
                    children: title,
                  },
                },
                description
                  ? {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '28px',
                          color: '#cbd5e1',
                          lineHeight: 1.4,
                          lineClamp: 2,
                        },
                        children: description,
                      },
                    }
                  : null,
                metaText
                  ? {
                      type: 'div',
                      props: {
                        style: { fontSize: '24px', color: '#94a3b8' },
                        children: metaText,
                      },
                    }
                  : null,
                tags.length > 0
                  ? {
                      type: 'div',
                      props: {
                        style: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
                        children: tags.slice(0, 3).map((tag, i) => ({
                          type: 'div',
                          key: i,
                          props: { style: pill, children: `#${tag.trim()}` },
                        })),
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      flex: 1,
                      height: '2px',
                      background: 'linear-gradient(90deg, #3b82f6, transparent)',
                    },
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '24px', color: '#64748b' },
                    children: new URL(siteConfig.url).host,
                  },
                },
              ],
            },
          },
        ],
    },
  };

  // satori accepts the h-object tree at runtime; its TS types only describe
  // React elements, so cast through unknown.
  const svg = await satori(tree as unknown as ReactNode, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Noto Sans TC', data: regular, weight: 400, style: 'normal' },
      { name: 'Noto Sans TC', data: bold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles: [FONT_FILES.regular, FONT_FILES.bold], loadSystemFonts: false },
  });
  return Buffer.from(resvg.render().asPng());
}

/** Locale-aware default-card input (no document fields). */
export function defaultCardInput(locale: Locale): OgCardInput {
  const dictionary = getDictionary(locale);
  return {
    locale,
    title: dictionary.brand.tagline || dictionary.brand.title,
    author: siteConfig.author,
  };
}
