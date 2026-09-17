'use client';

import { useMemo, useState } from 'react';
import type { Post } from '@/lib/content';
import { FiArrowDown, FiArrowUp, FiSearch, FiList } from 'react-icons/fi';
import { siteConfig } from '@/lib/config';
import { PostListItem } from './post-list-item';
import { TimelineWrapper } from './timeline-wrapper';
import type { Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

interface Props {
  posts: Post[];
  pageSize?: number;
  locale: Locale;
  initialSearch?: string;
}

type SortOrder = 'new' | 'old';

export function PostListWithControls({ posts, pageSize, locale, initialSearch = '' }: Props) {
  const labels = getDictionary(locale).common;
  const [sortOrder, setSortOrder] = useState<SortOrder>('new');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const size = pageSize ?? siteConfig.postsPerPage ?? 5;

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return posts;

    return posts.filter((post) => {
      const haystack = [
        post.title,
        post.description,
        post.custom_excerpt,
        post.tags?.join(' ')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [posts, normalizedQuery]);

  const sortedPosts = useMemo(() => {
    const arr = [...filteredPosts];
    arr.sort((a, b) => {
      const aDate = a.published_at
        ? new Date(a.published_at).getTime()
        : 0;
      const bDate = b.published_at
        ? new Date(b.published_at).getTime()
        : 0;
      return sortOrder === 'new' ? bDate - aDate : aDate - bDate;
    });
    return arr;
  }, [filteredPosts, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / size));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * size;
  const currentPosts = sortedPosts.slice(start, start + size);

  const handleChangeSort = (order: SortOrder) => {
    setSortOrder(order);
    setPage(1);
  };

  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    setPage(1);

    const url = new URL(window.location.href);
    if (value.trim()) {
      url.searchParams.set('q', value);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/70 px-2 py-1 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
          <FiList className="h-3.5 w-3.5" />
          <span>{labels.sort}</span>
          <button
            type="button"
            onClick={() => handleChangeSort('new')}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition duration-180 ease-snappy ${sortOrder === 'new'
              ? 'bg-blue-600 text-white dark:bg-blue-600'
              : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
          >
            <FiArrowDown className="h-3 w-3" />
            {labels.newest}
          </button>
          <button
            type="button"
            onClick={() => handleChangeSort('old')}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition duration-180 ease-snappy ${sortOrder === 'old'
              ? 'bg-blue-600 text-white dark:bg-blue-600'
              : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
          >
            <FiArrowUp className="h-3 w-3" />
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
        <p>
          {labels.pageStatus(currentPage, totalPages, sortedPosts.length)}
          {normalizedQuery && ` ${labels.searchStatus(searchTerm)}`}
        </p>
        {normalizedQuery && sortedPosts.length === 0 && (
          <button
            type="button"
            onClick={() => updateSearchTerm('')}
            className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
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
            <PostListItem key={post._id} post={post} />
          ))}
        </TimelineWrapper>
      )}

      {totalPages > 1 && currentPosts.length > 0 && (
        <nav className="flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700"
          >
            {labels.previousPage}
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p)}
                  className={`h-7 w-7 rounded text-xs ${isActive
                    ? 'bg-blue-600 text-white dark:bg-blue-600'
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
            className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700"
          >
            {labels.nextPage}
          </button>
        </nav>
      )}
    </div>
  );
}
