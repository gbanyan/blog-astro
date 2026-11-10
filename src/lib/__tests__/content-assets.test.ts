import { describe, expect, it } from 'vitest';
import { contentAssetFile, contentAssetSize } from '@/lib/content-asset-files';
import { contentAssetPath, isContentAsset } from '@/lib/content-assets';

describe('contentAssetPath', () => {
  it.each([
    ['../assets/a/b.jpg', '/assets/a/b.jpg'],
    ['assets/b.png', '/assets/b.png'],
    ['/assets/c.webp', '/assets/c.webp'],
    ['https://cdn.example.com/../assets/x.jpg', 'https://cdn.example.com/../assets/x.jpg'],
    ['other/x.jpg', 'other/x.jpg'],
  ])('%s → %s', (input, expected) => {
    expect(contentAssetPath(input)).toBe(expected);
  });
});

describe('isContentAsset', () => {
  it('recognises every spelling of a content asset and nothing else', () => {
    expect(isContentAsset('../assets/a.jpg')).toBe(true);
    expect(isContentAsset('/assets/a.jpg')).toBe(true);
    expect(isContentAsset('https://x/assets/a.jpg')).toBe(false);
    expect(isContentAsset('feature.png')).toBe(false);
  });
});

describe('contentAssetFile / contentAssetSize', () => {
  it('returns nothing for missing files and non-assets', () => {
    expect(contentAssetFile('../assets/definitely-missing-file.jpg')).toBeNull();
    expect(contentAssetFile('https://x/a.jpg')).toBeNull();
    expect(contentAssetSize('../assets/definitely-missing-file.jpg')).toBeUndefined();
  });
});
