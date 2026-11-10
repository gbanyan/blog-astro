/**
 * Invariants over the real `content/` submodule, checked through the same
 * content and SEO modules the site renders with (run in the build as
 * `npm run check-i18n-content`).
 */
import { describe, expect, it } from 'vitest';
import { getAllDocuments, translationsOf, type ContentDocument } from '@/lib/content';
import { metadataForDocument } from '@/lib/seo';

const documents = await getAllDocuments();
const english = documents.filter((document) => document.locale === 'en');
const chinese = documents.filter((document) => document.locale === 'zh-TW');

function label(document: ContentDocument) {
  return document.sourcePath;
}

describe('content invariants', () => {
  it('has documents in both locales', () => {
    expect(chinese.length).toBeGreaterThan(0);
    expect(english.length).toBeGreaterThan(0);
  });

  it('gives every document a unique route', () => {
    const urls = documents.map((document) => document.url);
    expect(urls.filter((url, index) => urls.indexOf(url) !== index)).toEqual([]);
  });

  it('has at most one document per locale and translation id', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const document of documents) {
      const key = `${document.collection}|${document.translationId}|${document.locale}`;
      if (seen.has(key)) duplicates.push(label(document));
      seen.add(key);
    }
    expect(duplicates).toEqual([]);
  });

  it('translates every zh-TW document, and every translation has its zh-TW source', () => {
    const untranslated = chinese
      .filter((document) => !translationsOf(document, documents).has('en'))
      .map(label);
    const orphans = english
      .filter((document) => !translationsOf(document, documents).has('zh-TW'))
      .map(label);
    expect({ untranslated, orphans }).toEqual({ untranslated: [], orphans: [] });
  });

  it('keeps routing and asset metadata paired with the source', () => {
    for (const translation of english) {
      const source = translationsOf(translation, documents).get('zh-TW');
      if (!source) continue;
      const name = label(translation);
      expect(translation.slug, name).toBe(source.slug);
      expect(translation.status, name).toBe(source.status);
      expect(String(translation.published_at), name).toBe(String(source.published_at));
      expect(translation.feature_image, name).toBe(source.feature_image);
    }
  });

  it('marks finished translations as translated, with translated prose or title', () => {
    for (const translation of english.filter((document) => !document.isPlaceholder)) {
      const source = translationsOf(translation, documents).get('zh-TW');
      const name = label(translation);
      expect(translation.translation_status, name).toBe('translated');
      expect(
        translation.body.raw !== source?.body.raw || translation.title !== source?.title,
        name
      ).toBe(true);
    }
  });

  it('emits a self hreflang link and only links within the translation group', () => {
    for (const document of documents) {
      const head = metadataForDocument(document, documents);
      const group = translationsOf(document, documents);
      const name = label(document);
      expect(head.alternates.find((entry) => entry.locale === document.locale)?.href, name).toBe(
        head.canonical
      );
      for (const { locale } of head.alternates) {
        if (locale !== 'x-default') expect(group.has(locale as never), name).toBe(true);
      }
    }
  });

  it('excludes the withdrawn Arc post', () => {
    expect(documents.some((document) => document.sourcePath.includes('Arc 瀏覽器使用心得'))).toBe(
      false
    );
  });
});
