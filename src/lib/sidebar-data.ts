/**
 * Server-only sidebar data preparation.
 *
 * Pulling the full content records into a client bundle (via
 * `getAllTagsWithCount` or `allPages`) bloats the initial JS. Computing this
 * once on the server and passing only tiny serializable props keeps the client
 * bundle lean.
 */
import { getAllTagsWithCount } from '@/lib/tags';
import { getPagesByLocale } from '@/lib/content';
import type { ContentLocale } from '@/lib/content';
import { siteConfig } from '@/lib/config';

export interface TagItem {
  tag: string;
  slug: string;
  count: number;
}

export interface SidebarData {
  /** Top tags, precomputed server-side. */
  tags: TagItem[];
  aboutUrl: string;
  avatarSrc: string;
}

export function getSidebarData(locale?: ContentLocale): SidebarData {
  const tags = getAllTagsWithCount(locale).slice(0, 5);
  const pages = getPagesByLocale(locale);
  const aboutPage =
    pages.find((p) => p.nav_category === 'about') ??
    pages.find((p) => p.slug === 'about-me');

  return {
    tags,
    aboutUrl: aboutPage?.url ?? '/pages/about-me',
    avatarSrc: siteConfig.avatar,
  };
}
