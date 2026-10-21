import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  inlineImageAssetNames,
  inlineImageSrcset,
  inlineVariantUrl,
  inlineVariantWidths,
} from '@/lib/content-image-variants';

describe('inlineVariantWidths', () => {
  it('uses presets below the intrinsic width plus the intrinsic width', () => {
    expect(inlineVariantWidths(1024)).toEqual([480, 800, 1024]);
    expect(inlineVariantWidths(300)).toEqual([300]);
    expect(inlineVariantWidths(1600)).toEqual([480, 800, 1200, 1600]);
    expect(inlineVariantWidths(4000)).toEqual([480, 800, 1200, 1600]);
  });
});

describe('inlineImageAssetNames', () => {
  it('finds inline and reference-style asset images only', () => {
    const md = [
      '![a](../assets/a.jpg) text [link](../assets/doc.pdf)',
      '![b](assets/b.png "title")',
      '![remote](https://x/c.jpg)',
      '[ref]: ../assets/d.webp',
    ].join('\n');
    expect(inlineImageAssetNames(md).sort()).toEqual(['a.jpg', 'b.png', 'd.webp']);
  });
});

describe('inlineImageSrcset', () => {
  const publicDir = mkdtempSync(path.join(tmpdir(), 'variants-'));
  afterAll(() => rmSync(publicDir, { recursive: true, force: true }));

  it('emits a srcset only when every variant exists', () => {
    mkdirSync(path.join(publicDir, 'assets/_responsive'), { recursive: true });
    for (const w of [480, 800]) {
      writeFileSync(path.join(publicDir, inlineVariantUrl('/assets/x.jpg', w)), '');
    }
    expect(inlineImageSrcset('/assets/x.jpg', 1000, publicDir)).toBeUndefined();
    writeFileSync(path.join(publicDir, inlineVariantUrl('/assets/x.jpg', 1000)), '');
    expect(inlineImageSrcset('/assets/x.jpg', 1000, publicDir)).toBe(
      '/assets/_responsive/x.jpg.480w.webp 480w, /assets/_responsive/x.jpg.800w.webp 800w, /assets/_responsive/x.jpg.1000w.webp 1000w'
    );
  });

  it('skips GIFs and non-asset URLs', () => {
    expect(inlineImageSrcset('/assets/anim.gif', 400, publicDir)).toBeUndefined();
    expect(inlineImageSrcset('https://x/a.jpg', 400, publicDir)).toBeUndefined();
  });
});
