'use client';

import { useEffect, useState } from 'react';
import { FaMastodon } from 'react-icons/fa';
import { FiArrowRight } from 'react-icons/fi';
import {
  stripHtml,
  truncateText,
  formatRelativeTime,
  type MastodonStatus
} from '@/lib/mastodon';
import { siteConfig } from '@/lib/config';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
/**
 * Mastodon feed card.
 * Data is fetched server-side via the /api/mastodon route handler so the
 * browser never talks to the external instance directly, while the
 * lazy-rendered client card stays interactive.
 */
function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i}>
          <div
            className="mastodon-skeleton-shimmer h-3 w-3/4 rounded"
            style={{ animationDelay: `${i * 120}ms` }}
          />
          <div
            className="mastodon-skeleton-shimmer mt-2 h-3 w-full rounded"
            style={{ animationDelay: `${i * 120}ms` }}
          />
          <div
            className="mastodon-skeleton-shimmer mt-2 h-2 w-1/3 rounded"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

/** Client-fetched status list. */
function StatusListContent({ statuses, locale, labels }: { statuses: MastodonStatus[] | null; locale: Locale; labels: Dictionary['mastodon'] }) {

  if (!statuses || statuses.length === 0) {
    return (
      <p className="type-small text-slate-400 dark:text-slate-400">
        {labels.noStatus}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {statuses.map((status) => {
        // Handle boosts (reblogs)
        const displayStatus = status.reblog || status;
        const content = stripHtml(displayStatus.content);
        const truncated = truncateText(content, 180);
        const relativeTime = formatRelativeTime(status.created_at, locale);
        const hasMedia = displayStatus.media_attachments.length > 0;

        return (
          <article key={status.id} className="group/post">
            <a
              href={status.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block space-y-1.5 transition-opacity hover:opacity-70"
            >
              {/* Boost indicator */}
              {status.reblog && (
                <div className="type-small flex items-center gap-1 text-slate-400 dark:text-slate-400">
                  <FiArrowRight className="h-2.5 w-2.5 rotate-90" />
                  <span>{labels.boosted}</span>
                </div>
              )}

              {/* Content */}
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {truncated}
              </p>

              {/* Media attachments - render images/videos from remote URLs */}
              {hasMedia && (
                <div
                  className={`mt-1.5 grid gap-1 ${
                    displayStatus.media_attachments.length === 1
                      ? 'grid-cols-1'
                      : 'grid-cols-2'
                  }`}
                >
                  {displayStatus.media_attachments.map((att) => {
                    const src = att.preview_url ?? att.url;
                    if (!src) return null;

                    if (att.type === 'image') {
                      return (
                        // Remote Mastodon CDN URLs (arbitrary hosts) —
                        // next/image would require unbounded remotePatterns.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={att.id}
                          src={src}
                          alt={att.description ?? ''}
                          loading="lazy"
                          className="aspect-video w-full rounded-md object-cover"
                        />
                      );
                    }
                    if (att.type === 'gifv' && att.url) {
                      return (
                        <div
                          key={att.id}
                          className="overflow-hidden rounded-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <video
                            src={att.url}
                            poster={att.preview_url ?? undefined}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="aspect-video w-full object-cover"
                          />
                        </div>
                      );
                    }
                    if (att.type === 'video' && att.url) {
                      return (
                        <div
                          key={att.id}
                          className="overflow-hidden rounded-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <video
                            src={att.url}
                            poster={att.preview_url ?? undefined}
                            controls
                            playsInline
                            className="aspect-video w-full object-cover"
                          />
                        </div>
                      );
                    }
                    if (att.type === 'audio' && att.preview_url) {
                      return (
                        <div
                          key={att.id}
                          className="flex aspect-video w-full items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700"
                        >
                          {/* Remote Mastodon CDN preview URL — next/image can't be
                              used for arbitrary remote hosts (see image note above). */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={att.preview_url}
                            alt={att.description ?? labels.audio}
                            loading="lazy"
                            className="h-full w-full object-cover opacity-80"
                          />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {/* Timestamp */}
              <time
                className="type-small block text-slate-400 dark:text-slate-400"
                dateTime={status.created_at}
              >
                {relativeTime}
              </time>
            </a>
          </article>
        );
      })}
    </div>
  );
}
export function MastodonFeed({ locale, labels }: { locale: Locale; labels: Dictionary['mastodon'] }) {
  const [statuses, setStatuses] = useState<MastodonStatus[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteConfig.social.mastodon) return;
    let cancelled = false;
    ;(async () => {
      try {
        const res = await fetch('/api/mastodon', { cache: 'no-store' });
        const data = await res.json();
        const list: MastodonStatus[] | null = Array.isArray(data.statuses) ? data.statuses : null;
        if (!cancelled) {
          setStatuses(list);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setStatuses([]);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const mastodonUrl = siteConfig.social.mastodon;
  if (!mastodonUrl) return null;

  return (
    <section className="motion-card group rounded-xl border bg-white px-4 py-3 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-900/90">
      {/* Header */}
      <div className="type-small mb-3 flex items-center gap-2 font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
        <FaMastodon className="h-4 w-4 text-purple-500 dark:text-purple-400" />
        {labels.title}
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : (
        <StatusListContent statuses={statuses} locale={locale} labels={labels} />
      )}

      <a
        href={mastodonUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="type-small mt-3 flex items-center justify-end gap-1.5 text-slate-500 transition-colors hover:text-accent-textLight dark:text-slate-400 dark:hover:text-accent-textDark"
      >
        {labels.more}
        <FiArrowRight className="h-3 w-3" />
      </a>
    </section>
  );
}
