import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';

/**
 * Content assets: files under the content submodule's `assets/` directory,
 * referenced from markdown and frontmatter as `../assets/x.jpg` (or
 * `assets/x.jpg`) and served publicly at `/assets/x.jpg` (mirrored into
 * `public/assets/` by `scripts/sync-assets.mjs`).
 *
 * This module is the one owner of that mapping. It stays free of site
 * config and Astro imports so the remark/rehype plugins loaded by
 * `astro.config.mjs` can use it; absolute URLs come from `socialImageUrl()`
 * in `og.ts`.
 */

/**
 * Public site path for a content asset reference:
 * `../assets/x` and `assets/x` → `/assets/x`. Anything else (already-public
 * `/assets/x`, absolute URLs, other paths) is returned unchanged.
 */
export function contentAssetPath(src: string): string {
  if (src.startsWith('../assets/')) return src.slice(2);
  if (src.startsWith('assets/')) return `/${src}`;
  return src;
}

/** Whether `src` refers to a local content asset (after normalization). */
export function isContentAsset(src: string): boolean {
  return contentAssetPath(src).startsWith('/assets/');
}

/**
 * The file on disk behind a content asset reference: the submodule source
 * (`content/assets/...`) when present, else the mirrored copy in
 * `public/assets/...`; null for non-assets and missing files.
 */
export function contentAssetFile(src: string): string | null {
  const publicPath = contentAssetPath(src);
  if (!publicPath.startsWith('/assets/')) return null;
  const relative = publicPath.slice(1);
  for (const root of ['content', 'public']) {
    const candidate = path.join(process.cwd(), root, relative);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const sizeCache = new Map<string, { width: number; height: number } | undefined>();

/** Intrinsic pixel size of a content asset, read from disk (cached); undefined when unknown. */
export function contentAssetSize(src: string): { width: number; height: number } | undefined {
  const publicPath = contentAssetPath(src);
  if (sizeCache.has(publicPath)) return sizeCache.get(publicPath);
  let size: { width: number; height: number } | undefined;
  const file = contentAssetFile(publicPath);
  if (file) {
    try {
      const result = imageSize(readFileSync(file));
      if (result.width && result.height) size = { width: result.width, height: result.height };
    } catch {
      size = undefined;
    }
  }
  sizeCache.set(publicPath, size);
  return size;
}
