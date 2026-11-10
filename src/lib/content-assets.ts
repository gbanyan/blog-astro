/**
 * Content assets: files under the content submodule's `assets/` directory,
 * referenced from markdown and frontmatter as `../assets/x.jpg` (or
 * `assets/x.jpg`) and served publicly at `/assets/x.jpg` (mirrored into
 * `public/assets/` by `scripts/sync-assets.mjs`).
 *
 * This module is the one owner of that mapping. It is isomorphic (no Node,
 * Astro or site-config imports) so client islands, and the remark/rehype
 * plugins loaded by `astro.config.mjs`, can use it. Disk access (file path,
 * intrinsic size) lives in the server-only `content-asset-files.ts`; absolute
 * URLs come from `socialImageUrl()` in `og.ts`.
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
