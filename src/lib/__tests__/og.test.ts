import { describe, expect, it } from 'vitest';
import { documentOgUrl, socialImageUrl } from '@/lib/og';
import type { Page, Post } from '@/lib/content';

describe('socialImageUrl', () => {
  it('rewrites ../assets to the /assets public root', () => {
    expect(socialImageUrl('../assets/cover.jpg')).toBe(
      'https://blog.gbanyan.net/assets/cover.jpg'
    );
  });

  it('returns null when no feature image is set', () => {
    expect(socialImageUrl()).toBeNull();
    expect(socialImageUrl('')).toBeNull();
  });

  it('passes through already-absolute URLs', () => {
    expect(socialImageUrl('https://cdn.example.com/x.png')).toBe(
      'https://cdn.example.com/x.png'
    );
  });

  it('prefixes plain relative paths with a leading slash', () => {
    expect(socialImageUrl('feature.png')).toBe('https://blog.gbanyan.net/feature.png');
  });
});

describe('documentOgUrl', () => {
  const post = {
    __ignoredType: 'Post',
    flattenedPath: 'my-post',
  } as unknown as Post;

  const enPost = {
    __ignoredType: 'Post',
    flattenedPath: 'en/my-post',
  } as unknown as Post;

  const page = {
    __ignoredType: 'Page',
    flattenedPath: 'about',
  } as unknown as Page;

  it('builds the static /og path from the collection and flattenedPath', () => {
    expect(documentOgUrl(post)).toBe('https://blog.gbanyan.net/og/posts/my-post.png');
  });

  it('keeps the en segment for English documents (uniqueness)', () => {
    expect(documentOgUrl(enPost)).toBe('https://blog.gbanyan.net/og/posts/en/my-post.png');
  });

  it('routes pages under /og/pages/', () => {
    expect(documentOgUrl(page)).toBe('https://blog.gbanyan.net/og/pages/about.png');
  });
});
