import { describe, expect, it } from 'vitest';
import { ogCardUrl, socialImageUrl } from '@/lib/og';

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

describe('ogCardUrl', () => {
  it('builds the /api/og endpoint with locale and title', () => {
    const url = ogCardUrl({ locale: 'zh-TW', title: '測試' });
    expect(url.startsWith('https://blog.gbanyan.net/api/og?')).toBe(true);
    expect(url).toContain('locale=zh-TW');
    expect(url).toContain('title=');
  });

  it('adds description when provided', () => {
    const url = ogCardUrl({ locale: 'en', title: 'T', description: 'desc here' });
    expect(url).toContain('description=');
  });

  it('slices tags to the first three', () => {
    const url = ogCardUrl({ locale: 'en', title: 'T', tags: ['a', 'b', 'c', 'd'] });
    expect(url).toContain('tags=a%2Cb%2Cc');
    expect(url).not.toContain('d');
  });
});
