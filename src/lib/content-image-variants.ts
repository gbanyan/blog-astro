import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Responsive WebP variants for inline Markdown images.
 *
 * Inline images are rendered by the content layer (rehype), outside Astro's
 * `getImage()` pipeline, so their variants are produced by `sync-assets`
 * (`generateInlineImageVariants`) into `public/assets/_responsive/`. The
 * variant set is a pure function of the image's intrinsic width, so the rehype
 * plugin can compute the same URLs; it only emits a `srcset` when every
 * variant file exists, degrading to the original image otherwise.
 *
 * Plain Node-compatible (type-stripped TS, `node:` imports and sharp only) so
 * `scripts/sync-assets.mjs` can import it directly.
 */

export const INLINE_IMAGE_WIDTHS = [480, 800, 1200, 1600];
export const INLINE_IMAGE_QUALITY = 78;
export const RESPONSIVE_DIR = '_responsive';
const OPTIMIZABLE_RE = /\.(jpe?g|png|webp)$/i;

export function isOptimizableInlineImage(assetPath: string): boolean {
  return OPTIMIZABLE_RE.test(assetPath);
}

/** Candidate widths: the presets below the intrinsic width, plus the intrinsic width (≤ max). */
export function inlineVariantWidths(intrinsicWidth: number): number[] {
  const max = INLINE_IMAGE_WIDTHS[INLINE_IMAGE_WIDTHS.length - 1];
  const widths = INLINE_IMAGE_WIDTHS.filter((w) => w < intrinsicWidth);
  if (intrinsicWidth <= max) widths.push(intrinsicWidth);
  return widths;
}

/** `/assets/a.jpg`, 480 → `/assets/_responsive/a.jpg.480w.webp` */
export function inlineVariantUrl(assetUrl: string, width: number): string {
  const relative = assetUrl.replace(/^\/assets\//, '');
  return `/assets/${RESPONSIVE_DIR}/${relative}.${width}w.webp`;
}

/**
 * `srcset` for a public `/assets/...` image of known intrinsic width, or
 * `undefined` when the image isn't optimizable or a variant is missing under
 * `publicDir`.
 */
export function inlineImageSrcset(
  assetUrl: string,
  intrinsicWidth: number,
  publicDir: string
): string | undefined {
  if (!assetUrl.startsWith('/assets/') || !isOptimizableInlineImage(assetUrl)) return undefined;
  const widths = inlineVariantWidths(intrinsicWidth);
  if (widths.length === 0) return undefined;
  const candidates: string[] = [];
  for (const width of widths) {
    const url = inlineVariantUrl(assetUrl, width);
    if (!existsSync(path.join(publicDir, url))) return undefined;
    candidates.push(`${encodeURI(url)} ${width}w`);
  }
  return candidates.join(', ');
}

const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(\s*<?((?:\.\.\/)?assets\/[^)\s>]+)/g;
const REFERENCE_DEF_RE = /^\s*\[[^\]]+\]:\s*<?((?:\.\.\/)?assets\/[^\s>]+)/gm;

/** Asset file names referenced as inline Markdown images in `markdown`. */
export function inlineImageAssetNames(markdown: string): string[] {
  const names = new Set<string>();
  for (const re of [MARKDOWN_IMAGE_RE, REFERENCE_DEF_RE]) {
    for (const match of markdown.matchAll(re)) {
      names.add(decodeURI(match[1].replace(/^(\.\.\/)?assets\//, '')));
    }
  }
  return [...names];
}

async function listMarkdown(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listMarkdown(full);
      return /\.mdx?$/i.test(entry.name) ? [full] : [];
    })
  );
  return files.flat();
}

/**
 * Generate WebP variants for every optimizable image referenced inline by the
 * Markdown under `contentDir/{posts,pages}`. Writes to
 * `publicAssetsDir/_responsive/`. Returns the number of files written.
 */
export async function generateInlineImageVariants(
  contentDir: string,
  publicAssetsDir: string
): Promise<number> {
  const { default: sharp } = await import('sharp');
  const { imageSize } = await import('image-size');
  const markdownFiles = (
    await Promise.all(['posts', 'pages'].map((d) => listMarkdown(path.join(contentDir, d))))
  ).flat();
  const names = new Set<string>();
  for (const file of markdownFiles) {
    for (const name of inlineImageAssetNames(await readFile(file, 'utf8'))) names.add(name);
  }

  let written = 0;
  const jobs = [...names].filter(isOptimizableInlineImage).map(async (name) => {
    const source = path.join(contentDir, 'assets', name);
    try {
      if (!(await stat(source)).isFile()) return;
    } catch {
      return;
    }
    const input = await readFile(source);
    const { width } = imageSize(input);
    if (!width) return;
    for (const w of inlineVariantWidths(width)) {
      const target = path.join(
        publicAssetsDir,
        inlineVariantUrl(`/assets/${name}`, w).replace(/^\/assets\//, '')
      );
      await mkdir(path.dirname(target), { recursive: true });
      await sharp(input).rotate().resize({ width: w, withoutEnlargement: true })
        .webp({ quality: INLINE_IMAGE_QUALITY })
        .toFile(target);
      written += 1;
    }
  });
  await Promise.all(jobs);
  return written;
}
