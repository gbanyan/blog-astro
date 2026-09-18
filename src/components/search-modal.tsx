'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import { Command } from 'cmdk';
import { FiSearch, FiHome, FiFileText, FiTag, FiBook } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { getLocaleFromPathname, type SupportedLocale } from '@/lib/locale-switcher';
import type { Dictionary } from '@/lib/i18n/dictionaries';

interface PagefindResult {
  url: string;
  meta: { title?: string; tags?: string };
  excerpt?: string;
  /** Pagefind 1.5+: excerpt without <mark> tags */
  plain_excerpt?: string;
  /** Pagefind 1.5+: which meta fields matched the query */
  matchedMetaFields?: string[];
}

interface QuickAction {
  id: string;
  title: string;
  url: string;
  icon: React.ReactNode;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentPosts?: { title: string; url: string }[];
  labels: Dictionary['search'];
  errorLabel: Dictionary['errors']['errorTitle'];
  /** `Astro.url.pathname`, passed by the `.astro` host (replaces `usePathname`). */
  currentPath: string;
}

type PagefindStatus = 'idle' | 'ready' | 'error';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Highlight query terms in plain text; returns safe HTML. */
function highlightPlain(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (terms.length === 0) return escaped;
  const re = new RegExp(`(${terms.join('|')})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function localizeInternalUrl(url: string, locale: SupportedLocale): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url;

  const withoutEnglishPrefix =
    url === '/en'
      ? '/'
      : url.startsWith('/en/')
        ? url.slice('/en'.length)
        : url;

  if (locale === 'en') {
    return url === '/en' || url.startsWith('/en/')
      ? url
      : withoutEnglishPrefix === '/'
        ? '/en'
        : `/en${withoutEnglishPrefix}`;
  }

  return withoutEnglishPrefix || '/';
}

export function SearchModal({
  isOpen,
  onClose,
  recentPosts = [],
  labels,
  errorLabel,
  currentPath,
}: SearchModalProps) {
  const locale = getLocaleFromPathname(currentPath);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagefindStatus, setPagefindStatus] = useState<PagefindStatus>('idle');
  const pagefindRef = useRef<{
    init: () => void;
    options: (opts: { bundlePath: string }) => Promise<void>;
    preload: (query: string) => void;
    debouncedSearch: (
      query: string,
      opts: object,
      debounceMs: number
    ) => Promise<{ results: { data: () => Promise<PagefindResult> }[] } | null>;
  } | null>(null);

  // Initialize Pagefind when modal opens (read-only consumer — does not alter index)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadPagefind = async () => {
      try {
        const pagefindUrl = `${window.location.origin}/_pagefind/pagefind.js`;
        // Runtime-selected module specifier (absolute URL from the current
        // origin); the bundle is built by the pagefind CLI, not by Vite.
        const pagefind = await import(/* @vite-ignore */ pagefindUrl);
        // bundlePath must match public/_pagefind copy from build script
        await pagefind.options({ bundlePath: '/_pagefind/' });
        if (cancelled) return;
        await pagefind.init();
        if (cancelled) return;
        pagefindRef.current = pagefind;
        setPagefindStatus('ready');
      } catch (error) {
        console.error('Failed to load Pagefind:', error);
        if (!cancelled) setPagefindStatus('error');
      }
    };

    loadPagefind();

    return () => {
      cancelled = true;
      pagefindRef.current = null;
      setPagefindStatus('idle');
      setSearch('');
      setResults([]);
    };
  }, [isOpen]);

  // Debounced search when user types
  useEffect(() => {
    const query = search.trim();
    if (!query || pagefindStatus !== 'ready' || !pagefindRef.current) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      const pagefind = pagefindRef.current;
      if (!pagefind) return;

      try {
        pagefind.preload(query);
        const searchResult = await pagefind.debouncedSearch(query, {}, 300);
        if (searchResult === null || cancelled) return; // Superseded by newer search

        const dataPromises = searchResult.results.slice(0, 10).map((r) => r.data());
        const items = await Promise.all(dataPromises);
        if (cancelled) return;
        setResults(
          items.map((item) => ({
            ...item,
            url: localizeInternalUrl(item.url, locale),
          }))
        );
        setLoading(false);
      } catch (error) {
        console.error('Pagefind search failed:', error);
        if (!cancelled) {
          setResults([]);
          setLoading(false);
          setPagefindStatus('error');
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, pagefindStatus, locale]);

  const handleSelect = useCallback(
    (url: string) => {
      onClose();
      void navigate(url);
    },
    [onClose]
  );

  const navActions: QuickAction[] = [
    { id: 'home', title: labels.home, url: localizeInternalUrl('/', locale), icon: <FiHome className="size-4" /> },
    {
      id: 'blog',
      title: labels.blog,
      url: localizeInternalUrl('/blog', locale),
      icon: <FiFileText className="size-4" />,
    },
    {
      id: 'tags',
      title: labels.tags,
      url: localizeInternalUrl('/tags', locale),
      icon: <FiTag className="size-4" />,
    },
  ];

  const recentPostActions: QuickAction[] = recentPosts.map((p) => ({
    id: `post-${p.url}`,
    title: p.title,
    url: localizeInternalUrl(p.url, locale),
    icon: <FiBook className="size-4" />,
  }));

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      label={labels.dialogLabel}
      shouldFilter={false}
      className="fixed left-1/2 top-[20%] z-[9999] w-full max-w-2xl -translate-x-1/2 rounded-2xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95"
    >
      <div className="flex items-center border-b border-slate-200 px-4 dark:border-slate-700">
        <FiSearch className="size-5 shrink-0 text-slate-400" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder={labels.inputPlaceholder}
          className="flex h-14 w-full bg-transparent px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <Command.List className="scroll-panel max-h-[min(60vh,400px)] p-2">
        {search.trim() && (pagefindStatus === 'idle' || loading) && (
          <Command.Loading className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
            {labels.searching}
          </Command.Loading>
        )}

        {search.trim() && pagefindStatus === 'error' && (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400" role="status">
            {errorLabel}
          </div>
        )}

        {!loading && !search.trim() && (
          <>
            <Command.Group heading={labels.navigation} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group-heading]]:dark:text-slate-400">
              {navActions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={`${action.title} ${action.url}`}
                  onSelect={() => handleSelect(action.url)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors',
                    'data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900',
                    'dark:text-slate-300 dark:data-[selected=true]:bg-slate-800 dark:data-[selected=true]:text-slate-100 dark:hover:text-accent'
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {action.icon}
                  </span>
                  <span className="truncate">{action.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
            {recentPostActions.length > 0 && (
              <Command.Group heading={labels.recentPosts} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group-heading]]:dark:text-slate-400">
                {recentPostActions.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={`${action.title} ${action.url}`}
                    onSelect={() => handleSelect(action.url)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors',
                      'data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900',
                      'dark:text-slate-300 dark:data-[selected=true]:bg-slate-800 dark:data-[selected=true]:text-slate-100 dark:hover:text-accent'
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {action.icon}
                    </span>
                    <span className="truncate">{action.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </>
        )}

        {!loading && pagefindStatus === 'ready' && search.trim() && results.length > 0 && (
          <Command.Group heading={labels.searchResults} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group-heading]]:dark:text-slate-400">
            {results.map((result, i) => {
              const title = result.meta?.title ?? result.url;
              const matchedMeta = result.matchedMetaFields ?? [];
              const titleMatched = matchedMeta.includes('title');
              const metaBadges = matchedMeta
                .map((field) =>
                  field === 'title' ? labels.titleMatches : field === 'tags' ? labels.tagsMatches : undefined
                )
                .filter(Boolean);
              const excerptHtml = result.excerpt
                ? result.excerpt
                : result.plain_excerpt
                  ? highlightPlain(result.plain_excerpt, search)
                  : null;

              return (
                <Command.Item
                  key={`${result.url}-${i}`}
                  value={`${title} ${result.url}`}
                  onSelect={() => handleSelect(result.url)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2.5 outline-none transition-colors',
                    'data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800 dark:hover:text-accent'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="truncate text-sm font-medium text-slate-900 dark:text-slate-100 [&_mark]:bg-yellow-200 [&_mark]:font-semibold [&_mark]:text-slate-900 dark:[&_mark]:bg-yellow-600 dark:[&_mark]:text-slate-100"
                      dangerouslySetInnerHTML={{
                        __html: titleMatched ? highlightPlain(title, search) : escapeHtml(title),
                      }}
                    />
                    {metaBadges.length > 0 && (
                      <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-textLight dark:bg-slate-700 dark:text-slate-300">
                        {metaBadges[0]}
                      </span>
                    )}
                  </span>
                  {excerptHtml && (
                    <span
                      className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400 [&_mark]:bg-yellow-200 [&_mark]:font-semibold [&_mark]:text-slate-900 dark:[&_mark]:bg-yellow-600 dark:[&_mark]:text-slate-100"
                      dangerouslySetInnerHTML={{ __html: excerptHtml }}
                    />
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {!loading && pagefindStatus === 'ready' && search.trim() && results.length === 0 && (
          <Command.Empty className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {labels.noResults}
          </Command.Empty>
        )}
      </Command.List>

      <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{labels.close}</span>
        <span className="ml-4">{labels.open}</span>
      </div>
    </Command.Dialog>
  );
}
