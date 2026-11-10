/**
 * Pure zoom/pan/fit math for the Mermaid diagram viewer. No DOM access: the
 * viewer (`mermaid-viewer-dom.ts`) measures rects and feeds plain numbers in,
 * then writes the returned view state to the viewport transform.
 *
 * Coordinates are canvas-local: (0, 0) is the canvas' top-left corner, and
 * the viewport is drawn at `translate(x, y) scale(scale)` with a top-left
 * transform origin.
 */

export const ZOOM_STEP = 0.2;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 5;
export const WHEEL_ZOOM_FACTOR = 0.001;
/** Breathing room (px, total per axis) left around a fitted diagram. */
export const FIT_PADDING = 32;

export interface ViewState {
  scale: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const INITIAL_VIEW: Readonly<ViewState> = { scale: 1, x: 0, y: 0 };

export function clampScale(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

/**
 * Zoom to `scale` (clamped) while keeping the canvas-local point `anchor`
 * fixed on screen — the point under the cursor / pinch centre stays put.
 */
export function zoomAt(view: ViewState, scale: number, anchor: Point): ViewState {
  const next = clampScale(scale);
  const ratio = next / view.scale;
  return {
    scale: next,
    x: anchor.x - ratio * (anchor.x - view.x),
    y: anchor.y - ratio * (anchor.y - view.y),
  };
}

/**
 * Scale after a wheel event. The step grows with the current scale so the
 * zoom feels uniform at every magnification; negative `deltaY` zooms in.
 */
export function wheelZoomScale(scale: number, deltaY: number): number {
  const delta = -deltaY * WHEEL_ZOOM_FACTOR;
  return clampScale(scale * (1 + delta * scale));
}

/** Translate for a drag that started at `start` (pointer) with the view at `origin`. */
export function panBy(origin: Point, start: Point, current: Point): Point {
  return {
    x: origin.x + (current.x - start.x),
    y: origin.y + (current.y - start.y),
  };
}

export function pinchDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pinchCenter(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * View that shows the whole diagram inside the canvas, reset to the origin.
 *
 * `drawn` is the SVG's measured on-screen size, which includes the active
 * transform — mermaid's `useMaxWidth` clamps the SVG to the container width,
 * so the viewBox is NOT the drawn size. Dividing by `currentScale` recovers
 * the untransformed layout size. Returns null when the SVG has no size yet.
 */
export function fitView(canvas: Size, drawn: Size, currentScale: number): ViewState | null {
  const naturalWidth = drawn.width / currentScale;
  const naturalHeight = drawn.height / currentScale;
  if (!naturalWidth || !naturalHeight) return null;
  const scale = Math.min(
    (canvas.width - FIT_PADDING) / naturalWidth,
    (canvas.height - FIT_PADDING) / naturalHeight,
    ZOOM_MAX
  );
  return { scale: clampScale(scale), x: 0, y: 0 };
}

/** Visible zoom level label, e.g. `125%`. */
export function formatZoomLevel(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
