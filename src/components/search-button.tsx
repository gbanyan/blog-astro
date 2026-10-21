'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { FiSearch } from 'react-icons/fi';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const subscribeNoop = () => () => {};
const isApplePlatform = () => {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent);
};

/**
 * Header search trigger (⌘K / Ctrl+K). Kept in its own module — separate
 * from the lazy-loaded `SearchModal` — so the heavy modal (cmdk + Pagefind
 * client) stays out of the initial header bundle, mirroring the source
 * `next/dynamic(..., { ssr: false })` split.
 *
 * ⌘/Ctrl+K stays global (the conventional shortcut works from inside text
 * fields too); there are deliberately no single-key shortcuts that could
 * fire while typing.
 */
export function SearchButton({
  onClick,
  onPreload,
  labels,
}: {
  onClick: () => void;
  /** Warm the lazy modal chunk on hover/focus intent. */
  onPreload?: () => void;
  labels: Dictionary['search'];
}) {
  // Server + hydration snapshot is the Apple glyph; non-Apple platforms swap
  // to "Ctrl K" right after hydration without a mismatch.
  const apple = useSyncExternalStore(subscribeNoop, isApplePlatform, () => true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && !e.isComposing && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onPreload}
      onFocus={onPreload}
      className="motion-link relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition-all duration-260 ease-snappy before:absolute before:-inset-1.5 before:rounded-full before:content-[''] hover:-translate-y-0.5 hover:bg-slate-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-accent-textDark"
      aria-label={labels.dialogLabel}
      aria-keyshortcuts="Meta+K Control+K"
      aria-haspopup="dialog"
    >
      <FiSearch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden shrink-0 whitespace-nowrap sm:inline">{labels.dialogLabel}</span>
      <kbd
        aria-hidden="true"
        className="hidden rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400 sm:inline-block"
      >
        {apple ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}
