import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';
import { visit } from 'unist-util-visit';

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 675;

function rewriteSrc(src: string): string {
  if (src.startsWith('../assets/')) {
    return src.replace('../assets', '/assets');
  }
  if (src.startsWith('assets/')) {
    return `/${src.replace(/^\/?/, '')}`;
  }
  return src;
}

function resolveLocalAsset(src: string): string | null {
  if (!src.startsWith('/assets/')) return null;

  const relative = src.slice(1); // assets/...
  const candidates = [
    path.join(process.cwd(), 'content', relative),
    path.join(process.cwd(), 'public', relative),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function readDimensions(filePath: string): { width: number; height: number } {
  try {
    const result = imageSize(readFileSync(filePath));
    if (result.width && result.height) {
      return { width: result.width, height: result.height };
    }
  } catch {
    // Fall through to defaults when the file is missing or unreadable.
  }
  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

/**
 * Rewrite markdown image paths to `/assets/...`, attach intrinsic
 * dimensions for CLS-safe layout, and mark images for lazy loading.
 */
export function rehypeOptimizeImages() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'img' || !node.properties) return;
      if (typeof node.properties.src !== 'string') return;

      node.properties.src = rewriteSrc(node.properties.src);

      const localPath = resolveLocalAsset(node.properties.src);
      if (localPath) {
        const { width, height } = readDimensions(localPath);
        node.properties.width = width;
        node.properties.height = height;
      } else if (!node.properties.width || !node.properties.height) {
        node.properties.width = DEFAULT_WIDTH;
        node.properties.height = DEFAULT_HEIGHT;
      }

      node.properties.loading = 'lazy';
      node.properties.decoding = 'async';
      // Hint used by MarkdownBody → next/image sizes
      if (!node.properties.sizes) {
        node.properties.sizes =
          '(max-width: 768px) 100vw, (max-width: 1200px) 800px, 800px';
      }
    });
  };
}
