import { describe, expect, it } from 'vitest';
import { defaultOgImage, documentOgUrl, socialImageUrl } from '@/lib/og';
import { makePage, makePost } from './fixtures';

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

  it('percent-encodes non-ASCII asset names like every other absolute URL', () => {
    expect(socialImageUrl('../assets/封面.jpg')).toBe(
      'https://blog.gbanyan.net/assets/%E5%B0%81%E9%9D%A2.jpg'
    );
  });

  it('prefixes plain relative paths with a leading slash', () => {
    expect(socialImageUrl('feature.png')).toBe('https://blog.gbanyan.net/feature.png');
  });
});

describe('documentOgUrl', () => {
  const post = makePost('my-post');
  const enPost = makePost('en/my-post');
  const page = makePage('about');

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

describe('defaultOgImage', () => {
  it('uses the per-locale build-time card when no override is configured', () => {
    expect(defaultOgImage('zh-TW')).toBe('/og/index/zh-TW.png');
    expect(defaultOgImage('en')).toBe('/og/index/en.png');
  });
});
