'use client';

import { Suspense, lazy, useState } from 'react';
import { SearchButton } from './search-button';
import type { Dictionary } from '@/lib/i18n/dictionaries';

// The modal (cmdk + Pagefind client) is code-split out of the header
// bundle, mirroring the source `next/dynamic(..., { ssr: false })`.
const SearchModal = lazy(
  () =>
    import('./search-modal').then((mod) => ({
      default: mod.SearchModal,
    }))
);

/**
 * Tiny client island for the header search. Keeps the open/close state
 * out of the server-rendered header so `site-header.astro` can stay a
 * static host without client state in the initial bundle.
 */
export function SiteHeaderSearch({
  recentPosts = [],
  locale,
  searchLabels,
  errorLabel,
  currentPath,
}: {
  recentPosts?: { title: string; url: string }[];
  locale: string;
  searchLabels: Dictionary['search'];
  errorLabel: Dictionary['errors']['errorTitle'];
  currentPath: string;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <SearchButton onClick={() => setIsSearchOpen(true)} labels={searchLabels} />
      <Suspense fallback={null}>
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          recentPosts={recentPosts}
          labels={searchLabels}
          errorLabel={errorLabel}
          currentPath={currentPath}
        />
      </Suspense>
    </>
  );
}