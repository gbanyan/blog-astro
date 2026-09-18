'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;
const WHEEL_ZOOM_FACTOR = 0.001;

interface ViewState {
  scale: number;
  x: number;
  y: number;
}

function clampScale(s: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s));
}

function attachViewer(wrapper: HTMLDivElement, viewport: HTMLDivElement) {
  const state: ViewState = { scale: 1, x: 0, y: 0 };
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let originAtDragStart = { x: 0, y: 0 };

  // --- Pinch state ---
  let lastPinchDist = 0;
  let pinching = false;

  const levelBtn = wrapper.querySelector<HTMLButtonElement>('.mermaid-zoom-level')!;

  const apply = () => {
    viewport.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    const value = `${Math.round(state.scale * 100)}%`;
    levelBtn.textContent = value;
    // Keep the accessible name in sync with the visible zoom level (WCAG 2.5.3).
    levelBtn.setAttribute('aria-label', `${levelBtn.dataset.resetLabel ?? 'reset'} ${value}`);
  };

  const zoomTo = (newScale: number, cx: number, cy: number) => {
    const clamped = clampScale(newScale);
    const wrapRect = wrapper.querySelector<HTMLElement>('.mermaid-canvas')!.getBoundingClientRect();

    // Point under cursor in viewport-local coords
    const px = cx - wrapRect.left;
    const py = cy - wrapRect.top;

    // Adjust translate so the point under cursor stays put
    const ratio = clamped / state.scale;
    state.x = px - ratio * (px - state.x);
    state.y = py - ratio * (py - state.y);
    state.scale = clamped;
    apply();
  };

  // --- Mouse drag ---
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    originAtDragStart = { x: state.x, y: state.y };
    wrapper.classList.add('mermaid-grabbing');
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    state.x = originAtDragStart.x + (e.clientX - dragStart.x);
    state.y = originAtDragStart.y + (e.clientY - dragStart.y);
    apply();
  };

  const onMouseUp = () => {
    dragging = false;
    wrapper.classList.remove('mermaid-grabbing');
  };

  // --- Wheel zoom ---
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * WHEEL_ZOOM_FACTOR;
    const newScale = clampScale(state.scale * (1 + delta * state.scale));
    zoomTo(newScale, e.clientX, e.clientY);
  };

  // --- Touch: pinch-to-zoom + drag ---
  const pinchDist = (t: TouchList) => {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  };

  const pinchCenter = (t: TouchList) => ({
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  });

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      pinching = true;
      lastPinchDist = pinchDist(e.touches);
      e.preventDefault();
    } else if (e.touches.length === 1) {
      dragging = true;
      dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      originAtDragStart = { x: state.x, y: state.y };
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (pinching && e.touches.length === 2) {
      e.preventDefault();
      const dist = pinchDist(e.touches);
      const center = pinchCenter(e.touches);
      const ratio = dist / lastPinchDist;
      zoomTo(state.scale * ratio, center.x, center.y);
      lastPinchDist = dist;
    } else if (dragging && e.touches.length === 1) {
      state.x = originAtDragStart.x + (e.touches[0].clientX - dragStart.x);
      state.y = originAtDragStart.y + (e.touches[0].clientY - dragStart.y);
      apply();
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) pinching = false;
    if (e.touches.length === 0) dragging = false;
  };

  // --- Canvas element (the pannable area) ---
  const canvas = wrapper.querySelector<HTMLElement>('.mermaid-canvas')!;
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  // --- Button handlers ---
  wrapper.querySelector('.mermaid-btn-zoomout')!.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    zoomTo(state.scale - ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  wrapper.querySelector('.mermaid-btn-zoomin')!.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    zoomTo(state.scale + ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  levelBtn.addEventListener('click', () => {
    state.scale = 1;
    state.x = 0;
    state.y = 0;
    apply();
  });

  // Fit the diagram to the canvas: shrink until the whole diagram is visible.
  // Shared by the toolbar button and the automatic initial fit.
  const fit = () => {
    const svg = viewport.querySelector('svg');
    if (!svg) return;
    const canvasRect = canvas.getBoundingClientRect();
    // mermaid's useMaxWidth clamps the SVG to the container width, so the
    // viewBox is NOT the drawn size. Fit against the SVG's actual layout
    // size — the rect includes the active transform, divide it out.
    const rect = svg.getBoundingClientRect();
    const natW = rect.width / state.scale;
    const natH = rect.height / state.scale;
    if (!natW || !natH) return;
    const padding = 32;
    const fitScale = Math.min(
      (canvasRect.width - padding) / natW,
      (canvasRect.height - padding) / natH,
      ZOOM_MAX
    );
    state.scale = clampScale(fitScale);
    state.x = 0;
    state.y = 0;
    apply();
  };

  wrapper.querySelector('.mermaid-btn-fit')!.addEventListener('click', fit);

  wrapper.querySelector('.mermaid-btn-fullscreen')!.addEventListener('click', () => {
    if (document.fullscreenElement === wrapper) {
      document.exitFullscreen();
    } else {
      wrapper.requestFullscreen().catch(() => {});
    }
  });

  // Cleanup
  const cleanup = () => {
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    wrapper.querySelector('.mermaid-btn-fit')!.removeEventListener('click', fit);
  };

  return { cleanup, fit };
}

function buildShell(labels: Dictionary['mermaid']): { wrapper: HTMLDivElement; viewport: HTMLDivElement } {
  const wrapper = document.createElement('div');
  wrapper.className = 'mermaid-diagram not-prose';

  const canvas = document.createElement('div');
  canvas.className = 'mermaid-canvas';

  const viewport = document.createElement('div');
  viewport.className = 'mermaid-viewport';

  canvas.appendChild(viewport);

  // Toolbar
  const bar = document.createElement('div');
  bar.className = 'mermaid-zoom-bar';

  const btnZoomOut = document.createElement('button');
  btnZoomOut.className = 'mermaid-zoom-btn mermaid-btn-zoomout';
  btnZoomOut.textContent = '−';
  btnZoomOut.ariaLabel = labels.zoomOut;

  const btnLevel = document.createElement('button');
  btnLevel.className = 'mermaid-zoom-btn mermaid-zoom-level';
  btnLevel.textContent = '100%';
  // Include the visible zoom level from the start (WCAG 2.5.3) — `apply`
  // keeps both text and label in sync while the viewer is used.
  btnLevel.ariaLabel = `${labels.reset} 100%`;
  btnLevel.dataset.resetLabel = labels.reset;

  const btnZoomIn = document.createElement('button');
  btnZoomIn.className = 'mermaid-zoom-btn mermaid-btn-zoomin';
  btnZoomIn.textContent = '+';
  btnZoomIn.ariaLabel = labels.zoomIn;

  const sep1 = document.createElement('span');
  sep1.className = 'mermaid-sep';

  const btnFit = document.createElement('button');
  btnFit.className = 'mermaid-zoom-btn mermaid-btn-fit';
  btnFit.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
  btnFit.ariaLabel = labels.fit;

  const btnFullscreen = document.createElement('button');
  btnFullscreen.className = 'mermaid-zoom-btn mermaid-btn-fullscreen';
  btnFullscreen.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
  btnFullscreen.ariaLabel = labels.fullscreen;

  bar.append(btnZoomOut, btnLevel, btnZoomIn, sep1, btnFit, btnFullscreen);
  wrapper.append(canvas, bar);

  return { wrapper, viewport };
}

export function MermaidRenderer({ labels }: { labels: Dictionary['mermaid'] }) {
  const { resolvedTheme } = useTheme();
  const containersRef = useRef<{ viewport: HTMLDivElement; wrapper: HTMLDivElement; source: string; fit: () => void }[]>([]);
  const cleanupRef = useRef<(() => void)[]>([]);
  const renderSeqRef = useRef(0);
  const lastThemeRef = useRef<'dark' | 'default' | null>(null);

  // Build the viewer shells once per mount. The figures are replaced by the
  // shells here, so this effect must NOT re-run on theme changes: a re-run
  // would find no figures and orphan the already-built shells (and an
  // in-flight first render would then loop over an empty list, leaving the
  // viewport empty). The zoom viewer is attached once per shell; a theme
  // re-render only swaps the SVG inside the persistent viewport.
  useEffect(() => {
    const figures = document.querySelectorAll<HTMLElement>(
      'pre.astro-code[data-language="mermaid"]'
    );

    const entries: typeof containersRef.current = [];

    figures.forEach((figure) => {
      const code = figure.querySelector('code');
      if (!code) return;

      const source = code.textContent?.trim() ?? '';
      if (!source) return;

      const { wrapper, viewport } = buildShell(labels);
      figure.replaceWith(wrapper);
      const viewer = attachViewer(wrapper, viewport);
      entries.push({ viewport, wrapper, source, fit: viewer.fit });
      cleanupRef.current.push(viewer.cleanup);
    });

    containersRef.current = entries;

    return () => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
      containersRef.current = [];
      renderSeqRef.current += 1; // abort any in-flight render
    };
  }, [labels]);

  // Render on mount and re-render when the resolved theme flips. On the
  // first pass `resolvedTheme` is still undefined (useTheme syncs from the
  // document in its own post-mount effect), so fall back to the <html> class
  // — the init snippet guarantees it is already correct pre-paint.
  useEffect(() => {
    const entries = containersRef.current;
    if (entries.length === 0) return;

    const dark =
      resolvedTheme ??
      (document.documentElement.classList.contains('dark') ? ('dark' as const) : ('light' as const));
    const theme = dark === 'dark' ? 'dark' : 'default';
    if (lastThemeRef.current === theme) return;

    const seq = ++renderSeqRef.current;
    lastThemeRef.current = theme;

    (async () => {
      // Dynamic import on purpose: mermaid is a ~1 MB bundle that must stay
      // code-split out of the island chunk (this island also hydrates on
      // pages with no diagrams). A static import would defeat that split.
      const mermaid = (await import('mermaid')).default;
      // Label dimensions must be measured with the final font, before Mermaid
      // fixes the SVG foreignObject sizes.
      await document.fonts.ready;
      if (seq !== renderSeqRef.current) return;

      mermaid.initialize({
        startOnLoad: false,
        theme,
        fontFamily: getComputedStyle(entries[0].wrapper).fontFamily,
        // Stock mermaid-dark paints neutral grays (#1f2020 nodes, #474949
        // subgraphs) that hue-clash with the site's slate canvas (#0f172a).
        // Map the dark palette onto the same slate tokens the diagram chrome
        // in globals.css uses; light keeps the stock default theme.
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
      });

      for (const { viewport, wrapper, source, fit } of entries) {
        if (seq !== renderSeqRef.current) return;
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        try {
          const { svg } = await mermaid.render(id, source);
          if (seq !== renderSeqRef.current) return;
          viewport.innerHTML = svg;
          wrapper.classList.add('mermaid-rendered');
          // Auto-fit: long node/subgraph titles make diagrams wider than the
          // canvas, and the SVG's width-fit then crops the overflow
          // (overflow: hidden). Fit the whole viewBox instead of cropping.
          fit();
        } catch {
          if (seq !== renderSeqRef.current) return;
          viewport.textContent = source;
        }
      }
    })().catch(() => {
      // Module load failure: allow a later theme flip to retry.
      if (seq === renderSeqRef.current) lastThemeRef.current = null;
    });
  }, [resolvedTheme]);

  return null;
}
