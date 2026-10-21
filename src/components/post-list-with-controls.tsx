'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowDown, FiArrowUp, FiSearch, FiList } from 'react-icons/fi';
import { siteConfig } from '@/lib/config';
import {
  matchesPostQuery,
  paginationItems,
  readPostListUrlState,
  sortPostEntries,
  writePostListUrlState,
  type PostListEntry,
  type PostListUrlState,
  type PostSortOrder,
} from '@/lib/post-list';
import { PostListItem } from './post-list-item';
import { TimelineWrapper } from './timeline-wrapper';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface Props {
  posts: PostListEntry[];
  pageSize?: number;
  locale: Locale;
  initialSearch?: string;
}

export function PostListWithControls({ posts, pageSize, locale, initialSearch = '' }: Props) {
  const labels = getDictionary(locale).common;
  const [sortOrder, setSortOrder] = useState<PostSortOrder>('new');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const listTopRef = useRef<HTMLDivElement>(null);

  // List state lives in the URL (`?q=&sort=old&page=2`). The static prerender
  // can't read query params, so the server/first client render use defaults
  // and the URL state is applied after mount (no hydration mismatch). Page
  // changes push history entries; Back/Forward re-sync from the URL.
  useEffect(() => {
    const applyUrlState = () => {
      const state = readPostListUrlState(window.location.search);
      setSearchTerm(state.q || initialSearch);
      setSortOrder(state.sort);
      setPage(state.page);
    };
    applyUrlState();
    window.addEventListener('popstate', applyUrlState);
    return () => window.removeEventListener('popstate', applyUrlState);
  }, [initialSearch]);

  const size = pageSize ?? siteConfig.postsPerPage ?? 5;

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredPosts = useMemo(
    () => posts.filter((post) => matchesPostQuery(post, normalizedQuery)),
    [posts, normalizedQuery]
  );

  const sortedPosts = useMemo(
    () => sortPostEntries(filteredPosts, sortOrder),
    [filteredPosts, sortOrder]
  );

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / size));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * size;
  const currentPosts = sortedPosts.slice(start, start + size);

  const writeUrl = (next: PostListUrlState, mode: 'push' | 'replace') => {
    const target = writePostListUrlState(window.location.href, next);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (target === current) return;
    if (mode === 'push') {
      // A null-state entry: Astro's ClientRouter ignores popstate between
      // such entries, and our popstate listener re-syncs the list.
      window.history.pushState(null, '', target);
    } else {
      window.history.replaceState(window.history.state, '', target);
    }
  };

  const handleChangeSort = (order: PostSortOrder) => {
    setSortOrder(order);
    setPage(1);
    writeUrl({ q: searchTerm, sort: order, page: 1 }, 'replace');
  };

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    setPage(1);
    writeUrl({ q: value, sort: sortOrder, page: 1 }, 'replace');
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    setPage(p);
    writeUrl({ q: searchTerm, sort: sortOrder, page: p }, 'push');

    // Bring the new page into view and move focus to the list top so keyboard
    // and screen-reader users land on the new results.
    const target = listTopRef.current;
    if (target) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (target.getBoundingClientRect().top < 0) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
      target.focus({ preventScroll: true });
    }
  };

  const sortButtonClass = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition duration-180 ease-snappy ${active
      ? 'bg-accent text-white'
      : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
    }`;

  return (
    <div
      ref={listTopRef}
      tabIndex={-1}
      className="scroll-mt-24 space-y-4 focus:outline-none"
    >
      <div className="flex flex-col gap-4 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/70 px-2 py-1 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
          <FiList className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{labels.sort}</span>
          <button
            type="button"
            onClick={() => handleChangeSort('new')}
            aria-pressed={sortOrder === 'new'}
            className={sortButtonClass(sortOrder === 'new')}
          >
            <FiArrowDown className="h-3 w-3" aria-hidden="true" />
            {labels.newest}
          </button>
          <button
            type="button"
            onClick={() => handleChangeSort('old')}
            aria-pressed={sortOrder === 'old'}
            className={sortButtonClass(sortOrder === 'old')}
          >
            <FiArrowUp className="h-3 w-3" aria-hidden="true" />
            {labels.oldest}
          </button>
        </div>
        <div className="flex w-full items-center text-sm sm:w-auto">
          <label htmlFor="post-search" className="sr-only">
            {labels.searchPosts}
          </label>
          <div className="relative w-full sm:w-64">
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="post-search"
              type="search"
              placeholder={labels.searchPlaceholder}
              value={searchTerm}
              onChange={(event) => updateSearchTerm(event.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition duration-180 ease-snappy focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-accent dark:focus:ring-accent/30"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <p aria-live="polite">
          {labels.pageStatus(currentPage, totalPages, sortedPosts.length)}
          {normalizedQuery && ` ${labels.searchStatus(searchTerm)}`}
        </p>
        {normalizedQuery && sortedPosts.length === 0 && (
          <button
            type="button"
            onClick={() => updateSearchTerm('')}
            className="text-accent-textLight underline-offset-2 hover:underline dark:text-accent-textDark"
          >
            {labels.clearSearch}
          </button>
        )}
      </div>

      {currentPosts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {labels.noMatchingPosts}
        </div>
      ) : (
        <TimelineWrapper className="space-y-3">
          {currentPosts.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </TimelineWrapper>
      )}

      {totalPages > 1 && currentPosts.length > 0 && (
        <nav
          aria-label={labels.pagination}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-slate-600 dark:text-slate-300"
        >
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="min-h-[44px] rounded border border-slate-200 px-3 transition-colors duration-180 ease-snappy hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {labels.previousPage}
          </button>
          <div className="order-first flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto">
            {paginationItems(currentPage, totalPages).map((p, i) => {
              if (p === null) {
                return (
                  <span key={`gap-${i}`} className="w-6 text-center text-slate-400" aria-hidden="true">
                    …
                  </span>
                );
              }
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={labels.goToPage(p)}
                  className={`h-[44px] min-w-[44px] rounded px-1 text-xs transition-colors duration-180 ease-snappy ${isActive
                    ? 'bg-accent text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="min-h-[44px] rounded border border-slate-200 px-3 transition-colors duration-180 ease-snappy hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {labels.nextPage}
          </button>
        </nav>
      )}
    </div>
  );
}
