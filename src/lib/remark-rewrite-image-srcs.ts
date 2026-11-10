import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { contentAssetPath } from './content-assets.ts';

/**
 * Rewrite markdown image URLs that point at the shared content asset
 * directory so rendered HTML uses public URLs (`/assets/...`).
 *
 * Runs in the remark stage, before Astro's internal `remark-collect-images`
 * plugin, so these public-dir assets are never registered as content-relative
 * image imports. A `../assets/` reference from a nested `en/` file would
 * otherwise resolve against a non-existent `content/posts/assets/` directory
 * and fail the build. The rehype-stage optimizer still attaches intrinsic
 * dimensions to the rewritten srcs.
 */
export function remarkRewriteImageSrcs() {
  const rewrite = (node: { url: string }) => {
    node.url = contentAssetPath(node.url);
  };

  return (tree: Root) => {
    visit(tree, 'image', (node) => rewrite(node));
    visit(tree, 'definition', (node) => rewrite(node));
  };
}
