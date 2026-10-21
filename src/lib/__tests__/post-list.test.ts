import { describe, expect, it } from 'vitest';
import type { Post } from '@/lib/content';
import {
  matchesPostQuery,
  paginationItems,
  postCoverSrc,
  postListExcerpt,
  readPostListUrlState,
  sortPostEntries,
  toPostListEntry,
  writePostListUrlState,
} from '@/lib/post-list';

function makePost(overrides: Partial<Post> = {}): Post {
  const raw = overrides.body?.raw ?? '這是一段內文。'.repeat(200);
  return {
    __ignoredType: 'Post',
    title: '測試文章',
    locale: 'zh-TW',
    translationId: 't',
    translationKey: 't',
    pairing: { key: 't', locale: 'zh-TW' },
    translationStatus: 'source',
    isPlaceholder: false,
    sourcePath: 'posts/test',
    raw,
    body: { raw, html: '<p>big html</p>', code: '<p>big html</p>' },
    _id: 'posts/test',
    _raw: {
      sourceFilePath: 'posts/test.md',
      sourceFileName: 'test.md',
      sourceFileDir: 'posts',
      contentType: 'markdown',
      flattenedPath: 'posts/test',
    },
    flattenedPath: 'test',
    url: '/blog/test',
    published_at: new Date('2024-05-01T00:00:00Z'),
    tags: ['Linux', 'HomeLab'],
    ...overrides,
  } as Post;
}

describe('toPostListEntry', () => {
  it('keeps only list fields and drops the rendered/raw body', () => {
    const entry = toPostListEntry(makePost({ custom_excerpt: '摘要' }));
    expect(entry).toEqual({
      id: 'posts/test',
      url: '/blog/test',
      title: '測試文章',
      locale: 'zh-TW',
      tags: ['Linux', 'HomeLab'],
      readingMinutes: 5,
      customExcerpt: '摘要',
      publishedAt: '2024-05-01T00:00:00.000Z',
    });
    const json = JSON.stringify(entry);
    expect(json).not.toContain('big html');
    expect(json).not.toContain('這是一段內文');
  });

  it('falls back to a 120-char body excerpt only without description/custom excerpt', () => {
    const entry = toPostListEntry(makePost());
    expect(entry.bodyExcerpt).toHaveLength(120);
    expect(postListExcerpt(entry)).toBe(entry.bodyExcerpt);
    expect(postListExcerpt(toPostListEntry(makePost({ description: 'D', custom_excerpt: 'C' })))).toBe('D');
  });

  it('attaches the thumbnail and tolerates missing dates/tags', () => {
    const thumb = { src: '/_astro/x.webp', srcset: '/_astro/x.webp 160w', width: 400, height: 300 };
    const entry = toPostListEntry(makePost({ published_at: undefined, tags: undefined }), thumb);
    expect(entry.thumbnail).toEqual(thumb);
    expect(entry.tags).toEqual([]);
    expect(entry.publishedAt).toBeUndefined();
  });
});

describe('postCoverSrc', () => {
  it('maps content-relative assets to public URLs and ignores others', () => {
    expect(postCoverSrc({ feature_image: '../assets/a.jpg' })).toBe('/assets/a.jpg');
    expect(postCoverSrc({ feature_image: 'https://x/a.jpg' })).toBeUndefined();
    expect(postCoverSrc({})).toBeUndefined();
  });
});

describe('matchesPostQuery', () => {
  const entry = toPostListEntry(makePost({ description: 'Proxmox setup', custom_excerpt: 'ZFS pool' }));
  it('searches title, description, custom excerpt, and tags', () => {
    expect(matchesPostQuery(entry, '')).toBe(true);
    expect(matchesPostQuery(entry, '測試')).toBe(true);
    expect(matchesPostQuery(entry, 'proxmox')).toBe(true);
    expect(matchesPostQuery(entry, 'zfs')).toBe(true);
    expect(matchesPostQuery(entry, 'homelab')).toBe(true);
    expect(matchesPostQuery(entry, 'kubernetes')).toBe(false);
  });
  it('does not search the body excerpt', () => {
    expect(matchesPostQuery(toPostListEntry(makePost()), '內文')).toBe(false);
  });
});

describe('sortPostEntries', () => {
  it('sorts by publish date in both directions', () => {
    const a = toPostListEntry(makePost({ _id: 'a', published_at: '2020-01-01' }));
    const b = toPostListEntry(makePost({ _id: 'b', published_at: '2023-01-01' }));
    expect(sortPostEntries([a, b], 'new').map((e) => e.id)).toEqual(['b', 'a']);
    expect(sortPostEntries([b, a], 'old').map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('URL state', () => {
  it('reads with defaults and validation', () => {
    expect(readPostListUrlState('')).toEqual({ q: '', page: 1, sort: 'new' });
    expect(readPostListUrlState('?q=zfs&page=3&sort=old')).toEqual({ q: 'zfs', page: 3, sort: 'old' });
    expect(readPostListUrlState('?page=abc&sort=weird')).toEqual({ q: '', page: 1, sort: 'new' });
  });
  it('writes only non-default params and keeps others', () => {
    expect(writePostListUrlState('https://x/blog?page=4&q=a', { q: '', page: 1, sort: 'new' })).toBe('/blog');
    expect(writePostListUrlState('https://x/blog?utm=1#h', { q: 'zfs', page: 2, sort: 'old' })).toBe(
      '/blog?utm=1&q=zfs&sort=old&page=2#h'
    );
  });
});

describe('paginationItems', () => {
  it('lists every page when there are few', () => {
    expect(paginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('windows long ranges around the current page', () => {
    expect(paginationItems(1, 11)).toEqual([1, 2, 3, 4, null, 11]);
    expect(paginationItems(6, 11)).toEqual([1, null, 5, 6, 7, null, 11]);
    expect(paginationItems(11, 11)).toEqual([1, null, 8, 9, 10, 11]);
    expect(paginationItems(4, 11)).toEqual([1, 2, 3, 4, 5, null, 11]);
  });
});
