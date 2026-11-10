import { describe, expect, it } from 'vitest';
import { adaptDocument, isIndexable, isPublished, translationsOf } from '@/lib/content';
import { makePage, makePost } from './fixtures';

describe('adaptDocument', () => {
  it('derives locale, route, ids and placeholder status from the entry', () => {
    const zh = adaptDocument({ id: 'dir/x', body: 'raw', data: { title: 'X' } }, 'posts');
    expect(zh).toMatchObject({
      collection: 'posts',
      locale: 'zh-TW',
      translationId: 'posts/dir/x',
      isPlaceholder: false,
      sourcePath: 'posts/dir/x',
      flattenedPath: 'dir/x',
      url: '/blog/dir/x',
      body: { raw: 'raw', html: '' },
    });
  });

  it('pairs an English entry with its source by stripping the en/ segment', () => {
    const en = adaptDocument({ id: 'en/x', data: { title: 'X', locale: 'en', slug: 'x' } }, 'pages');
    expect(en.translationId).toBe('pages/x');
    expect(en.url).toBe('/en/pages/x');
    // An English entry without translation_status is a placeholder.
    expect(en.isPlaceholder).toBe(true);
  });

  it('prefers explicit translation_id, then legacy translation_key', () => {
    const pinned = adaptDocument(
      { id: 'a', data: { title: 'A', translation_id: 'posts/pinned', translation_key: 'k' } },
      'posts'
    );
    expect(pinned.translationId).toBe('posts/pinned');
    const legacy = adaptDocument({ id: 'a', data: { title: 'A', translation_key: 'k' } }, 'posts');
    expect(legacy.translationId).toBe('k');
    expect(legacy).not.toHaveProperty('translation_key');
  });

  it('honours explicit is_placeholder and translation_status', () => {
    const translated = adaptDocument(
      { id: 'en/a', data: { title: 'A', locale: 'en', translation_status: 'translated' } },
      'posts'
    );
    expect(translated.isPlaceholder).toBe(false);
    const forced = adaptDocument({ id: 'a', data: { title: 'A', is_placeholder: true } }, 'posts');
    expect(forced.isPlaceholder).toBe(true);
  });
});

describe('visibility', () => {
  it('treats a missing status as published and hides drafts and private posts', () => {
    expect(isPublished(makePost('a'))).toBe(true);
    expect(isPublished(makePost('a', { status: 'Draft' }))).toBe(false);
    expect(isPublished(makePost('a', { visibility: 'members' }))).toBe(false);
  });

  it('never indexes placeholders', () => {
    expect(isIndexable(makePost('en/a', { translation_status: 'placeholder' }))).toBe(false);
    expect(isIndexable(makePost('en/a', { translation_status: 'translated' }))).toBe(true);
  });
});

describe('translationsOf', () => {
  const zh = makePost('x');
  const en = makePost('en/x', { translation_status: 'placeholder' });
  const other = makePost('y');
  const samePathPage = makePage('x');

  it('keys a document and its translations by locale within one collection', () => {
    const pair = translationsOf(zh, [zh, en, other, samePathPage]);
    expect([...pair.keys()]).toEqual(['zh-TW', 'en']);
    expect(pair.get('en')).toBe(en);
    expect(translationsOf(en, [zh, en]).get('zh-TW')).toBe(zh);
  });

  it('filters by visibility, including the document itself', () => {
    expect(translationsOf(zh, [zh, en], 'indexable').has('en')).toBe(false);
    expect(translationsOf(en, [zh, en], 'indexable').has('en')).toBe(false);
    expect(translationsOf(zh, [zh, en], 'published').has('en')).toBe(true);
  });

  it('keeps the first record when a locale repeats', () => {
    const duplicate = makePost('en/x-copy', { translation_id: 'posts/x', locale: 'en' });
    expect(translationsOf(zh, [zh, en, duplicate]).get('en')).toBe(en);
  });
});
