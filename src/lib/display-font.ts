import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Build-time reader for the CJK display-font subset produced by
 * `scripts/build-display-font.mjs`. Server-only (layout frontmatter): the
 * manifest lives in node_modules/.cache, resolved from cwd like og-render's
 * fonts because the bundler relocates import.meta-relative paths.
 */
export interface DisplayFontFace {
  weight: number;
  href: string;
  bytes: number;
  unicodeRange: string;
}

export interface DisplayFont {
  family: string;
  faces: DisplayFontFace[];
}

const MANIFEST = path.join(process.cwd(), 'node_modules', '.cache', 'display-font', 'manifest.json');
/** Family used when no subset was built: a locally installed copy, if any. */
const FALLBACK_FAMILY = 'LXGW WenKai TC';
/** Preload only a subset small enough not to crowd out the LCP resources. */
const PRELOAD_MAX_BYTES = 300 * 1024;

let cached: DisplayFont | null | undefined;

export function getDisplayFont(): DisplayFont | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    if (existsSync(MANIFEST)) {
      const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as DisplayFont;
      const publicDir = path.join(process.cwd(), 'public');
      const faces = manifest.faces.filter((face) => existsSync(path.join(publicDir, face.href)));
      if (faces.length) cached = { family: manifest.family, faces };
    }
  } catch {
    cached = null;
  }
  if (!cached) {
    console.warn('[display-font] no subset manifest; run `node scripts/build-display-font.mjs`. Headings use the fallback serif.');
  }
  return cached;
}

/**
 * Inline CSS: one @font-face per weight plus the `--font-display-cjk`
 * variable consumed by globals.css. The variable is always defined — an
 * undefined var() would invalidate the whole font-family declaration.
 */
export function displayFontCss(font: DisplayFont | null): string {
  if (!font) return `:root{--font-display-cjk:"${FALLBACK_FAMILY}";}`;
  const faces = font.faces
    .map(
      (face) =>
        `@font-face{font-family:"${font.family}";src:url("${face.href}") format("woff2");` +
        `font-weight:${face.weight};font-style:normal;font-display:swap;unicode-range:${face.unicodeRange};}`
    )
    .join('');
  return `${faces}:root{--font-display-cjk:"${font.family}";}`;
}

/** Subset files worth preloading (zh-TW pages render CJK headings above the fold). */
export function displayFontPreloads(font: DisplayFont | null): string[] {
  return (font?.faces ?? []).filter((face) => face.bytes <= PRELOAD_MAX_BYTES).map((face) => face.href);
}
