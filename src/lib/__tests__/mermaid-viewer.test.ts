import { describe, expect, it } from 'vitest';
import {
  FIT_PADDING,
  INITIAL_VIEW,
  ZOOM_MAX,
  ZOOM_MIN,
  clampScale,
  fitView,
  formatZoomLevel,
  panBy,
  pinchCenter,
  pinchDistance,
  wheelZoomScale,
  zoomAt,
} from '@/lib/mermaid-viewer';
import { hasMermaidBlock, MERMAID_BLOCK_SELECTOR, mermaidConfig, mermaidThemeFor } from '@/lib/mermaid';

describe('clampScale', () => {
  it('keeps in-range scales unchanged', () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(2.5)).toBe(2.5);
  });

  it('clamps to the zoom bounds', () => {
    expect(clampScale(0)).toBe(ZOOM_MIN);
    expect(clampScale(-3)).toBe(ZOOM_MIN);
    expect(clampScale(100)).toBe(ZOOM_MAX);
  });
});

describe('zoomAt', () => {
  it('keeps the anchor point fixed on screen', () => {
    const view = { scale: 1, x: 10, y: -20 };
    const anchor = { x: 200, y: 150 };
    const next = zoomAt(view, 2, anchor);
    expect(next.scale).toBe(2);
    // The diagram point under the anchor before and after must match.
    const before = { x: (anchor.x - view.x) / view.scale, y: (anchor.y - view.y) / view.scale };
    const after = { x: (anchor.x - next.x) / next.scale, y: (anchor.y - next.y) / next.scale };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('zooming at the origin with no translate keeps translate at zero', () => {
    expect(zoomAt(INITIAL_VIEW, 3, { x: 0, y: 0 })).toEqual({ scale: 3, x: 0, y: 0 });
  });

  it('clamps the target scale and uses the clamped ratio', () => {
    const next = zoomAt(INITIAL_VIEW, 50, { x: 100, y: 100 });
    expect(next.scale).toBe(ZOOM_MAX);
    expect(next.x).toBeCloseTo(100 - ZOOM_MAX * 100);
  });

  it('does not mutate the input view', () => {
    const view = { scale: 1, x: 0, y: 0 };
    zoomAt(view, 2, { x: 50, y: 50 });
    expect(view).toEqual({ scale: 1, x: 0, y: 0 });
  });
});

describe('wheelZoomScale', () => {
  it('zooms in on negative deltaY and out on positive deltaY', () => {
    expect(wheelZoomScale(1, -100)).toBeCloseTo(1.1);
    expect(wheelZoomScale(1, 100)).toBeCloseTo(0.9);
  });

  it('scales the step with the current magnification', () => {
    // 2 * (1 + 0.1 * 2) = 2.4
    expect(wheelZoomScale(2, -100)).toBeCloseTo(2.4);
  });

  it('stays within bounds', () => {
    expect(wheelZoomScale(ZOOM_MAX, -10_000)).toBe(ZOOM_MAX);
    expect(wheelZoomScale(ZOOM_MIN, 10_000)).toBe(ZOOM_MIN);
  });
});

describe('panBy', () => {
  it('offsets the drag-start origin by the pointer delta', () => {
    expect(panBy({ x: 10, y: 20 }, { x: 100, y: 100 }, { x: 130, y: 90 })).toEqual({ x: 40, y: 10 });
  });
});

describe('pinch helpers', () => {
  it('measures the distance and centre between two touches', () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(pinchCenter({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });
});

describe('fitView', () => {
  it('shrinks a too-wide diagram to the canvas width minus padding', () => {
    const view = fitView({ width: 632, height: 400 }, { width: 1200, height: 200 }, 1);
    expect(view).toEqual({ scale: (632 - FIT_PADDING) / 1200, x: 0, y: 0 });
  });

  it('uses the tighter of the two axes', () => {
    const view = fitView({ width: 1000, height: 232 }, { width: 400, height: 400 }, 1);
    expect(view?.scale).toBeCloseTo((232 - FIT_PADDING) / 400);
  });

  it('divides out the current transform from the measured size', () => {
    // Drawn at 2x: natural size is 300x100, so fitting is independent of the current zoom.
    const atTwo = fitView({ width: 632, height: 400 }, { width: 600, height: 200 }, 2);
    const atOne = fitView({ width: 632, height: 400 }, { width: 300, height: 100 }, 1);
    expect(atTwo).toEqual(atOne);
  });

  it('caps enlargement at ZOOM_MAX and floors at ZOOM_MIN', () => {
    expect(fitView({ width: 2000, height: 2000 }, { width: 10, height: 10 }, 1)?.scale).toBe(ZOOM_MAX);
    expect(fitView({ width: 100, height: 100 }, { width: 10_000, height: 10_000 }, 1)?.scale).toBe(ZOOM_MIN);
  });

  it('returns null for an unmeasured SVG', () => {
    expect(fitView({ width: 600, height: 400 }, { width: 0, height: 100 }, 1)).toBeNull();
    expect(fitView({ width: 600, height: 400 }, { width: 100, height: 0 }, 1)).toBeNull();
  });
});

describe('formatZoomLevel', () => {
  it('renders a rounded percentage', () => {
    expect(formatZoomLevel(1)).toBe('100%');
    expect(formatZoomLevel(0.25)).toBe('25%');
    expect(formatZoomLevel(1.2345)).toBe('123%');
  });
});

describe('hasMermaidBlock', () => {
  it('detects Shiki mermaid blocks', () => {
    expect(hasMermaidBlock('<pre class="astro-code" data-language="mermaid"><code>graph TD</code></pre>')).toBe(true);
  });

  it('detects plain language-mermaid code blocks', () => {
    expect(hasMermaidBlock('<pre><code class="language-mermaid">graph TD</code></pre>')).toBe(true);
  });

  it('ignores other languages and prose mentions', () => {
    expect(hasMermaidBlock('<pre class="astro-code" data-language="ts"><code>x</code></pre>')).toBe(false);
    expect(hasMermaidBlock('<p>I like mermaid diagrams</p>')).toBe(false);
    expect(hasMermaidBlock('')).toBe(false);
  });

  it('agrees with the client selector on the Shiki attribute', () => {
    expect(MERMAID_BLOCK_SELECTOR).toContain('[data-language="mermaid"]');
  });
});

describe('mermaid theme config', () => {
  it('maps the resolved site theme to a mermaid theme', () => {
    expect(mermaidThemeFor('dark')).toBe('dark');
    expect(mermaidThemeFor('light')).toBe('default');
  });

  it('overrides the dark palette onto slate tokens and keeps light stock', () => {
    const dark = mermaidConfig('dark', 'serif');
    expect(dark).toMatchObject({ startOnLoad: false, theme: 'dark', fontFamily: 'serif' });
    expect(dark.themeVariables).toMatchObject({ mainBkg: '#1e293b', clusterBorder: '#94a3b8' });
    expect(mermaidConfig('default', 'serif').themeVariables).toBeUndefined();
  });
});
