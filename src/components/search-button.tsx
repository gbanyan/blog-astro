'use client';

import { useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Header search trigger (⌘K / Ctrl+K). Kept in its own module — separate
 * from the lazy-loaded `SearchModal` — so the heavy modal (cmdk + Pagefind
 * client) stays out of the initial header bundle, mirroring the source
 * `next/dynamic(..., { ssr: false })` split.
 */
export function SearchButton({ onClick, labels }: { onClick: () => void; labels: Dictionary['search'] }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  return (
    <button
      onClick={onClick}
      className="motion-link inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition-all duration-260 ease-snappy hover:-translate-y-0.5 hover:bg-slate-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-accent"
      aria-label={`${labels.dialogLabel}⌘K`}
    >
      <FiSearch className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden shrink-0 whitespace-nowrap sm:inline">{labels.dialogLabel}</span>
      <kbd className="hidden rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400 sm:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}
