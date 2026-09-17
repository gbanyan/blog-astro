import type { Post } from '@/lib/content';
import { siteConfig } from '@/lib/config';
import { FiCalendar, FiClock, FiTag } from 'react-icons/fi';
import { MetaItem } from './meta-item';
import { estimateReadingMinutes, readingTimeLabel } from '@/lib/reading-time';

interface PostCardProps {
  post: Post;
  showTags?: boolean;
}

/**
 * Port of components/post-card.tsx. `LocalizedLink` becomes a plain `<a>`
 * (`post.url` is already locale-localized); `next/image` becomes an
 * intrinsic `<img>` with the same width/height, blur placeholder dropped.
 */
export function PostCard({ post, showTags = true }: PostCardProps) {
  const readingMinutes = estimateReadingMinutes(post.body?.raw ?? '');
  const cover =
    post.feature_image && post.feature_image.startsWith('../assets')
      ? post.feature_image.replace('../assets', '/assets')
      : undefined;

  return (
    <article className="motion-card group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 ease-snappy hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-accent opacity-80 transition-transform duration-300 ease-out group-hover:scale-x-100" />
      {cover && (
        <div className="relative w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <img
            src={cover}
            alt={post.title}
            width={640}
            height={360}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            className="mx-auto w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        </div>
      )}
      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {post.published_at && (
            <MetaItem icon={FiCalendar}>
              {new Date(post.published_at).toLocaleDateString(
                siteConfig.defaultLocale
              )}
            </MetaItem>
          )}
          {readingMinutes > 1 && (
            <MetaItem icon={FiClock} tone="muted">
              {readingTimeLabel(readingMinutes, post.locale)}
            </MetaItem>
          )}
          {showTags && post.tags && post.tags.length > 0 && (
            <MetaItem icon={FiTag} tone="muted">
              {post.tags.slice(0, 3).join(', ')}
            </MetaItem>
          )}
        </div>
        <h2 className="font-editorial text-lg font-semibold leading-snug">
          <a
            href={post.url}
            className="hover:text-accent dark:hover:text-accent"
          >
            {post.title}
          </a>
        </h2>
        {post.description && (
          <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
            {post.description}
          </p>
        )}
      </div>
    </article>
  );
}
