'use client';

import { Suspense, lazy, useCallback, useState } from 'react';
import { SearchButton } from './search-button';
import type { Dictionary } from '@/lib/i18n/dictionaries';

// The modal (cmdk + Pagefind client) is code-split out of the header
// bundle, mirroring the source `next/dynamic(..., { ssr: false })`.
const loadSearchModal = () => import('./search-modal');
const SearchModal = lazy(() =>
  loadSearchModal().then((mod) => ({
    default: mod.SearchModal,
  }))
);
// Fire-and-forget chunk warm-up on hover/focus intent (module imports are
// cached, so the later `lazy()` resolve reuses the same request).
const preloadSearchModal = () => {
  void loadSearchModal().catch(() => {});
};

/**
 * Tiny client island for the header search. Keeps the open/close state
 * out of the server-rendered header so `site-header.astro` can stay a
 * static host without client state in the initial bundle.
 */
export function SiteHeaderSearch({
  recentPosts = [],
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
  // The modal chunk is only requested after the first open (button or
  // ⌘/Ctrl+K); it then opens itself as soon as the chunk resolves.
  const [hasOpened, setHasOpened] = useState(false);
  const openSearch = useCallback(() => {
    setHasOpened(true);
    setIsSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  return (
    <>
      <SearchButton onClick={openSearch} onPreload={preloadSearchModal} labels={searchLabels} />
      {hasOpened && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={isSearchOpen}
            onClose={closeSearch}
            recentPosts={recentPosts}
            labels={searchLabels}
            errorLabel={errorLabel}
            currentPath={currentPath}
          />
        </Suspense>
      )}
    </>
  );
}
