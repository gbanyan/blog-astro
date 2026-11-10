/**
 * DOM half of the Mermaid diagram viewer: builds the zoom/pan shell that
 * replaces each Shiki mermaid block and wires its input handling. All the
 * geometry lives in the pure `mermaid-viewer.ts`; this module only measures
 * rects, forwards numbers, and writes the resulting transform.
 *
 * The markup and class names are a contract with the `.mermaid-*` rules in
 * src/styles/prose.css — keep them stable.
 */
import {
  INITIAL_VIEW,
  ZOOM_STEP,
  fitView,
  formatZoomLevel,
  panBy,
  pinchCenter,
  pinchDistance,
  wheelZoomScale,
  zoomAt,
  type Point,
  type ViewState,
} from './mermaid-viewer';

export interface MermaidViewerLabels {
  zoomOut: string;
  reset: string;
  zoomIn: string;
  fit: string;
  fullscreen: string;
}

export interface MermaidShell {
  wrapper: HTMLDivElement;
  canvas: HTMLDivElement;
  viewport: HTMLDivElement;
}

export interface MermaidViewer {
  /** Fit the whole diagram into the canvas (toolbar button + auto-fit after render). */
  fit: () => void;
  /** Remove every listener, including the window-level drag listeners. */
  cleanup: () => void;
}

const FIT_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
const FULLSCREEN_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';

function button(className: string, label: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.className = `mermaid-zoom-btn ${className}`;
  el.ariaLabel = label;
  return el;
}

export function buildShell(labels: MermaidViewerLabels): MermaidShell {
  const wrapper = document.createElement('div');
  wrapper.className = 'mermaid-diagram not-prose';

  const canvas = document.createElement('div');
  canvas.className = 'mermaid-canvas';

  const viewport = document.createElement('div');
  viewport.className = 'mermaid-viewport';

  canvas.appendChild(viewport);

  const bar = document.createElement('div');
  bar.className = 'mermaid-zoom-bar';

  const btnZoomOut = button('mermaid-btn-zoomout', labels.zoomOut);
  btnZoomOut.textContent = '−';

  // Include the visible zoom level from the start (WCAG 2.5.3) — the viewer
  // keeps both text and label in sync while it is used.
  const btnLevel = button('mermaid-zoom-level', `${labels.reset} ${formatZoomLevel(1)}`);
  btnLevel.textContent = formatZoomLevel(1);
  btnLevel.dataset.resetLabel = labels.reset;

  const btnZoomIn = button('mermaid-btn-zoomin', labels.zoomIn);
  btnZoomIn.textContent = '+';

  const sep = document.createElement('span');
  sep.className = 'mermaid-sep';

  const btnFit = button('mermaid-btn-fit', labels.fit);
  btnFit.innerHTML = FIT_ICON;

  const btnFullscreen = button('mermaid-btn-fullscreen', labels.fullscreen);
  btnFullscreen.innerHTML = FULLSCREEN_ICON;

  bar.append(btnZoomOut, btnLevel, btnZoomIn, sep, btnFit, btnFullscreen);
  wrapper.append(canvas, bar);

  return { wrapper, canvas, viewport };
}

const touchPoint = (t: Touch): Point => ({ x: t.clientX, y: t.clientY });

export function attachViewer({ wrapper, canvas, viewport }: MermaidShell): MermaidViewer {
  let view: ViewState = { ...INITIAL_VIEW };
  let dragging = false;
  let pinching = false;
  let dragStart: Point = { x: 0, y: 0 };
  let originAtDragStart: Point = { x: 0, y: 0 };
  let lastPinchDist = 0;

  // One signal tears down every listener, window-level ones included.
  const controller = new AbortController();
  const { signal } = controller;

  const levelBtn = wrapper.querySelector<HTMLButtonElement>('.mermaid-zoom-level')!;

  const apply = () => {
    viewport.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    const value = formatZoomLevel(view.scale);
    levelBtn.textContent = value;
    // Keep the accessible name in sync with the visible zoom level (WCAG 2.5.3).
    levelBtn.setAttribute('aria-label', `${levelBtn.dataset.resetLabel ?? 'reset'} ${value}`);
  };

  // Zoom around a viewport (client) point, converted to canvas-local coords.
  const zoomToClient = (scale: number, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    view = zoomAt(view, scale, { x: clientX - rect.left, y: clientY - rect.top });
    apply();
  };

  const zoomFromCenter = (scale: number) => {
    const rect = canvas.getBoundingClientRect();
    zoomToClient(scale, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const startDrag = (at: Point) => {
    dragging = true;
    dragStart = at;
    originAtDragStart = { x: view.x, y: view.y };
  };

  const dragTo = (at: Point) => {
    view = { ...view, ...panBy(originAtDragStart, dragStart, at) };
    apply();
  };

  // --- Mouse drag ---
  canvas.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0) return;
      startDrag({ x: e.clientX, y: e.clientY });
      wrapper.classList.add('mermaid-grabbing');
      e.preventDefault();
    },
    { signal }
  );
  window.addEventListener(
    'mousemove',
    (e) => {
      if (dragging) dragTo({ x: e.clientX, y: e.clientY });
    },
    { signal }
  );
  window.addEventListener(
    'mouseup',
    () => {
      dragging = false;
      wrapper.classList.remove('mermaid-grabbing');
    },
    { signal }
  );

  // --- Wheel zoom ---
  // Plain wheel scrolls the page; only Ctrl/⌘ + wheel (and trackpad pinch,
  // which browsers report as ctrlKey) zooms. In fullscreen there is no page
  // to scroll, so the plain wheel zooms there.
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey && !e.metaKey && document.fullscreenElement !== wrapper) return;
      e.preventDefault();
      zoomToClient(wheelZoomScale(view.scale, e.deltaY), e.clientX, e.clientY);
    },
    { passive: false, signal }
  );

  // --- Touch: pinch-to-zoom + drag ---
  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) {
        pinching = true;
        lastPinchDist = pinchDistance(touchPoint(e.touches[0]), touchPoint(e.touches[1]));
        e.preventDefault();
      } else if (e.touches.length === 1) {
        startDrag(touchPoint(e.touches[0]));
      }
    },
    { passive: false, signal }
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (pinching && e.touches.length === 2) {
        e.preventDefault();
        const a = touchPoint(e.touches[0]);
        const b = touchPoint(e.touches[1]);
        const dist = pinchDistance(a, b);
        const center = pinchCenter(a, b);
        zoomToClient(view.scale * (dist / lastPinchDist), center.x, center.y);
        lastPinchDist = dist;
      } else if (dragging && e.touches.length === 1) {
        dragTo(touchPoint(e.touches[0]));
      }
    },
    { passive: false, signal }
  );
  canvas.addEventListener(
    'touchend',
    (e) => {
      if (e.touches.length < 2) pinching = false;
      if (e.touches.length === 0) dragging = false;
    },
    { signal }
  );

  // --- Toolbar ---
  // Fit the diagram to the canvas: shrink until the whole diagram is visible.
  // Shared by the toolbar button and the automatic fit after each render.
  const fit = () => {
    const svg = viewport.querySelector('svg');
    if (!svg) return;
    const next = fitView(canvas.getBoundingClientRect(), svg.getBoundingClientRect(), view.scale);
    if (!next) return;
    view = next;
    apply();
  };

  const on = (selector: string, handler: () => void) =>
    wrapper.querySelector(selector)!.addEventListener('click', handler, { signal });

  on('.mermaid-btn-zoomout', () => zoomFromCenter(view.scale - ZOOM_STEP));
  on('.mermaid-btn-zoomin', () => zoomFromCenter(view.scale + ZOOM_STEP));
  on('.mermaid-zoom-level', () => {
    view = { ...INITIAL_VIEW };
    apply();
  });
  on('.mermaid-btn-fit', fit);
  on('.mermaid-btn-fullscreen', () => {
    if (document.fullscreenElement === wrapper) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrapper.requestFullscreen().catch(() => {});
    }
  });

  return { fit, cleanup: () => controller.abort() };
}
