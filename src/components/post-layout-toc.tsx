'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiList } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { MobileDrawer } from './mobile-drawer';
import { useDrawer } from '@/lib/use-drawer';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

// Lazy load PostToc since it's not critical for initial render (source used
// next/dynamic ssr:false; React.lazy is the Astro-island equivalent).
const PostToc = lazy(
  () => import('./post-toc').then((mod) => ({ default: mod.PostToc }))
);

interface PostLayoutTocProps {
  hasToc?: boolean;
  contentKey?: string;
  locale: Locale;
}

/**
 * Island half of the source's `PostLayout`: the TOC toggle buttons (portaled
 * to document.body), the mobile TOC drawer, and the lazily-loaded desktop
 * TOC portaled into `#desktop-post-toc-panel`. Toggling adds/removes the
 * `toc-open` class on the `[data-post-layout]` root, which the static host's
 * CSS grid/content-width transitions key off (globals.css).
 */
export function PostLayoutToc({
  hasToc = true,
  contentKey,
  locale
}: PostLayoutTocProps) {
  const { open: isTocOpen, setOpen: setIsTocOpen, mounted } = useDrawer();
  const [isDesktopTocOpen, setIsDesktopTocOpen] = useState(false);
  const labels = getDictionary(locale).common;
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);

  // Resolve the static panel slot inside this layout instance.
  useEffect(() => {
    const root = rootRef.current?.closest('[data-post-layout]');
    setPanelEl(root?.querySelector<HTMLElement>('#desktop-post-toc-panel') ?? null);
  }, []);

  const setDesktopTocOpen = (next: boolean) => {
    setIsDesktopTocOpen(next);
    const root = rootRef.current?.closest('[data-post-layout]');
    root?.classList.toggle('toc-open', next);
  };

  if (!hasToc) {
    return <span ref={rootRef} hidden aria-hidden="true" />;
  }

  const mobileToc = (
    <MobileDrawer
      open={isTocOpen}
      mounted={mounted}
      id="mobile-post-toc"
      onClose={() => setIsTocOpen(false)}
      title={labels.tableOfContents}
      icon={<FiList className="h-5 w-5 text-slate-500" />}
      closeLabel={labels.closeTableOfContents}
      side="bottom"
      backdropZ={1140}
      panelZ={1150}
    >
      <Suspense fallback={null}>
        <PostToc contentKey={contentKey} title={labels.tableOfContents} />
      </Suspense>
    </MobileDrawer>
  );

  const tocButton = (
    <button
      onClick={() => setIsTocOpen(true)}
      className={cn(
        'fixed bottom-6 right-16 z-40 flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-600 shadow-md backdrop-blur-sm transition hover:bg-slate-50 hover:text-accent dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-accent lg:hidden',
        isTocOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
      aria-label={labels.tableOfContents}
      aria-expanded={isTocOpen}
      aria-controls="mobile-post-toc"
    >
      <FiList className="h-4 w-4" aria-hidden="true" />
      <span>{labels.tableOfContents}</span>
    </button>
  );

  const desktopTocButton = (
    <button
      onClick={() => setDesktopTocOpen(!isDesktopTocOpen)}
      className={cn(
        'fixed bottom-6 right-16 z-40 hidden h-9 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-600 shadow-md backdrop-blur-sm transition hover:bg-slate-50 hover:text-accent dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-accent lg:flex'
      )}
      aria-label={isDesktopTocOpen ? labels.hideTableOfContents : labels.showTableOfContents}
      aria-expanded={isDesktopTocOpen}
      aria-controls="desktop-post-toc"
    >
      <FiList className="h-4 w-4" aria-hidden="true" />
      <span>{isDesktopTocOpen ? labels.hideTableOfContents : labels.showTableOfContents}</span>
    </button>
  );

  return (
    <>
      {/* Anchor kept inside the layout root so the island can find it. */}
      <span ref={rootRef} hidden aria-hidden="true" />

      {/* Desktop TOC panel content (portaled into the static aside) */}
      {isDesktopTocOpen && panelEl &&
        createPortal(
          <div className="toc-sidebar scroll-panel h-full pr-2">
            <Suspense fallback={null}>
              <PostToc contentKey={contentKey} title={labels.tableOfContents} />
            </Suspense>
          </div>,
          panelEl
        )}

      {/* Mobile TOC Overlay */}
      {mobileToc}

      {/* Toggle Buttons - Rendered via Portal */}
      {mounted &&
        createPortal(
          <>
            {tocButton}
            {desktopTocButton}
          </>,
          document.body
        )}
    </>
  );
}
