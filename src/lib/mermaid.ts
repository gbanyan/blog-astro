import type { MermaidConfig } from 'mermaid';

/**
 * Single owner of "where are the Mermaid diagrams": the server-side check
 * that decides whether a document ships the diagram script at all, and the
 * client-side selector that script uses to find the blocks. Both describe
 * the same Shiki output (`pre.astro-code[data-language="mermaid"]`), so they
 * live together and change together.
 *
 * Framework-free and type-only on `mermaid`, so importing this module never
 * pulls the ~1 MB mermaid bundle into a page or the server build.
 */

/** Client selector for the Shiki-rendered Mermaid source blocks. */
export const MERMAID_BLOCK_SELECTOR = 'pre.astro-code[data-language="mermaid"]';

// Shiki emits `data-language="mermaid"`; `language-mermaid` covers a plain
// fenced block that bypassed Shiki (e.g. a highlighter fallback).
const MERMAID_HTML_PATTERN = /data-language="mermaid"|language-mermaid/;

/** True when rendered document HTML contains at least one Mermaid block. */
export function hasMermaidBlock(html: string): boolean {
  return MERMAID_HTML_PATTERN.test(html);
}

export type MermaidTheme = 'dark' | 'default';

export function mermaidThemeFor(resolved: 'light' | 'dark'): MermaidTheme {
  return resolved === 'dark' ? 'dark' : 'default';
}

/**
 * `mermaid.initialize()` options for a theme. Stock mermaid-dark paints
 * neutral grays (#1f2020 nodes, #474949 subgraphs) that hue-clash with the
 * site's slate canvas (#0f172a), so the dark palette is mapped onto the same
 * slate tokens the diagram chrome in globals.css uses; light keeps the stock
 * default theme.
 */
export function mermaidConfig(theme: MermaidTheme, fontFamily: string): MermaidConfig {
  return {
    startOnLoad: false,
    theme,
    fontFamily,
    themeVariables:
      theme === 'dark'
        ? {
            background: 'transparent',
            primaryColor: '#1e293b',
            primaryBorderColor: '#64748b',
            // Flowchart nodes read mainBkg/nodeBorder, not primaryColor.
            mainBkg: '#1e293b',
            nodeBorder: '#64748b',
            primaryTextColor: '#e2e8f0',
            lineColor: '#94a3b8',
            clusterBkg: '#0f172a',
            // Group outlines need to stay visible when the viewer scales
            // down the diagram's thin strokes to fit the canvas.
            clusterBorder: '#94a3b8',
            textColor: '#e2e8f0',
            titleColor: '#e2e8f0',
          }
        : undefined,
  };
}
