import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { contentAssetPath } from './content-assets.ts';

/**
 * Server-only half of the content-asset module (see `content-assets.ts`):
 * where an asset lives on disk and how big it is.
 */

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
