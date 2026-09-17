import { useEffect, useRef, useState } from 'react';
import { FaGithub, FaMastodon, FaLinkedin } from 'react-icons/fa';
import { FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { siteConfig } from '@/lib/config';
import { MastodonFeed } from './mastodon-feed';
import { localizedPath, type Locale } from '@/lib/locales';
import { getDictionary } from '@/lib/i18n/dictionaries';

type TagItem = { tag: string; slug: string; count: number };
type SidebarVariant = 'default' | 'reading';

/**
 * Port of components/right-sidebar.tsx. `LocalizedLink` becomes a plain `<a>`
 * with `localizedPath` (the island knows its locale); `next/image` (avatar,
 * `unoptimized` in the source) becomes an intrinsic `<img>`.
 */
export function RightSidebarContent({
  tags,
  aboutUrl,
  avatarSrc,
  locale,
  forceLoadFeed = false,
  variant = 'default',
}: {
  tags: TagItem[];
  aboutUrl: string;
  avatarSrc: string;
  locale: Locale;
  forceLoadFeed?: boolean;
  variant?: SidebarVariant;
}) {
  const dictionary = getDictionary(locale);
  const [shouldLoadFeed, setShouldLoadFeed] = useState(forceLoadFeed);
  const feedRef = useRef<HTMLDivElement>(null);
  const readingVariant = variant === 'reading';

  useEffect(() => {
    if (forceLoadFeed) {
      return;
    }

    if (!feedRef.current) return;

    let observer: IntersectionObserver | null = null;
    let cleanupRequested = false;

    const setupObserver = () => {
      if (cleanupRequested) return;

      const el = feedRef.current;
      if (!el) return;

      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setShouldLoadFeed(true);
            observer?.disconnect();
          }
        },
        { rootMargin: '100px' }
      );

      observer.observe(el);
    };

    // Defer observer setup for better initial performance
    requestAnimationFrame(() => {
      if (!cleanupRequested && feedRef.current) {
        setupObserver();
      }
    });

    return () => {
      cleanupRequested = true;
      observer?.disconnect();
    };
  }, [forceLoadFeed]);

  const socialItems = [
    siteConfig.social.github && {
      key: 'github',
      href: siteConfig.social.github,
      icon: FaGithub,
      label: 'GitHub'
    },
    siteConfig.social.mastodon && {
      key: 'mastodon',
      href: siteConfig.social.mastodon,
      icon: FaMastodon,
      label: 'Mastodon'
    },
    siteConfig.social.linkedin && {
      key: 'linkedin',
      href: siteConfig.social.linkedin,
      icon: FaLinkedin,
      label: 'LinkedIn'
    }
  ].filter(
    // `'' && {…}` yields '' (falsy string), not null — a null/undefined check
    // alone keeps empty strings and crashes `<item.icon />` during SSR.
    // Only fully-configured service objects (with a truthy href) may render.
    (item): item is { key: string; href: string; icon: IconType; label: string } =>
      typeof item === 'object' && item !== null && item.href !== ''
  );

  return (
    <div className={readingVariant ? 'flex flex-col gap-6' : 'flex flex-col gap-4'}>
      <section
        className={readingVariant
          ? 'relative overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-5 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-100'
          : 'motion-card group relative overflow-hidden rounded-xl border bg-white px-4 py-4 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/80'}
      >
          {!readingVariant && (
            <>
              <div className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-full bg-sky-300/35 blur-3xl mix-blend-soft-light dark:bg-sky-500/25" />
              <div className="pointer-events-none absolute -bottom-12 right-[-2.5rem] h-28 w-28 rounded-full bg-indigo-300/30 blur-3xl mix-blend-soft-light dark:bg-indigo-500/20" />
            </>
          )}

          <div className="relative flex flex-col items-center">
            <a
              href={aboutUrl}
              aria-label={dictionary.sidebar.aboutAuthor}
              className="mb-2 inline-block transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={siteConfig.name}
                  width={96}
                  height={96}
                  className={readingVariant
                    ? 'h-20 w-20 rounded-full border border-slate-200 object-cover dark:border-slate-700'
                    : 'h-24 w-24 rounded-full border border-slate-200 object-cover shadow-sm transition-transform duration-300 ease-out group-hover:scale-105 dark:border-slate-700'}
                />
              ) : (
                <div className={readingVariant
                  ? 'flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900'
                  : 'flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-slate-50 shadow-sm transition-transform duration-300 ease-out group-hover:scale-105 dark:bg-slate-100 dark:text-slate-900'}>
                  {siteConfig.name.charAt(0).toUpperCase()}
                </div>
              )}
            </a>
            {socialItems.length > 0 && (
              <div className="mt-2 flex items-center gap-3 text-lg text-accent-textLight dark:text-accent-textDark">
                {socialItems.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel={item.key === 'mastodon' ? 'me noopener noreferrer' : 'noopener noreferrer'}
                    aria-label={item.label}
                    className="motion-link inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:-translate-y-0.5 hover:bg-accent-soft hover:text-accent dark:bg-slate-800 dark:text-slate-200 dark:hover:text-accent"
                  >
                    <item.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
            {dictionary.brand.aboutShort && (
              <div className="type-body mt-3 space-y-1 text-center text-slate-600 dark:text-slate-200">
                {dictionary.brand.aboutShort.split(/\n+/).map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Mastodon Feed - Lazy loaded when visible */}
        <div
          ref={feedRef}
          className={readingVariant
            ? '[&>section]:!border-slate-200/70 [&>section]:!bg-slate-50/60 [&>section]:!shadow-none [&>section]:hover:!translate-y-0 dark:[&>section]:!border-slate-800/80 dark:[&>section]:!bg-slate-900/40'
            : undefined}
        >
          {shouldLoadFeed && <MastodonFeed locale={locale} labels={dictionary.mastodon} />}
        </div>

        {tags.length > 0 && (
          <section
            className={readingVariant
              ? 'rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-100'
              : 'motion-card rounded-xl border bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'}
          >
            <h2 className="type-small flex items-center gap-2 font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
              <FiTrendingUp className="h-3 w-3 text-orange-400" />
              {dictionary.sidebar.popularTags}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-base">
              {tags.map(({ tag, slug, count }) => {
                let sizeClass = '';
                if (count >= 5) sizeClass = 'font-semibold';
                else if (count >= 3) sizeClass = 'font-medium';

                return (
                  <a
                    key={tag}
                    href={localizedPath(`/tags/${slug}`, locale)}
                    className={`${sizeClass} tag-chip rounded-full px-2 py-0.5 transition ${
                      readingVariant
                        ? 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 hover:text-accent-textLight dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-accent-textDark'
                        : 'bg-accent-soft text-accent-textLight hover:bg-accent hover:text-white dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white'
                    }`}
                  >
                    {tag}
                  </a>
                );
              })}
            </div>
            <div className="mt-3 type-small text-slate-500 dark:text-slate-400">
              <a
                href={localizedPath('/tags', locale)}
                className="motion-link inline-flex items-center gap-1 text-accent-textLight hover:text-accent dark:text-accent-textDark dark:hover:text-accent"
              >
                {dictionary.common.allTags}
                <FiArrowRight className="h-3 w-3" />
              </a>
            </div>
          </section>
        )}
    </div>
  );
}

export function RightSidebar({
  tags,
  aboutUrl,
  avatarSrc,
  locale,
  variant = 'default',
}: {
  tags: TagItem[];
  aboutUrl: string;
  avatarSrc: string;
  locale: Locale;
  variant?: SidebarVariant;
}) {
  return (
    <aside className="hidden lg:block">
      <div className={variant === 'reading' ? 'sticky top-24' : 'sticky top-20'}>
        <RightSidebarContent
          tags={tags}
          aboutUrl={aboutUrl}
          avatarSrc={avatarSrc}
          locale={locale}
          variant={variant}
        />
      </div>
    </aside>
  );
}