import { visit } from 'unist-util-visit';

const LOCALIZED_ROUTE_PREFIXES = ['/blog', '/pages', '/tags', '/projects'];

function isEnglishSource(file: { path?: string; history?: string[] }) {
  const sourcePath = (file.path || file.history?.[0] || '').replaceAll('\\', '/');
  return /\/(?:posts|pages)\/en\//.test(sourcePath);
}

function isLocalizedRoute(href: string) {
  return LOCALIZED_ROUTE_PREFIXES.some(
    (prefix) =>
      href === prefix ||
      href.startsWith(`${prefix}/`) ||
      href.startsWith(`${prefix}?`) ||
      href.startsWith(`${prefix}#`)
  );
}

/** Prefix internal Markdown routes for documents authored in the English locale. */
export function rehypeLocalizeLinks() {
  return (tree: any, file: { path?: string; history?: string[] }) => {
    if (!isEnglishSource(file)) return;

    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'a' || typeof node.properties?.href !== 'string') return;

      const href = node.properties.href;
      if (isLocalizedRoute(href) && !/^\/(?:zh-TW|en)(?:\/|$)/.test(href)) {
        node.properties.href = `/en${href}`;
      }
    });
  };
}
