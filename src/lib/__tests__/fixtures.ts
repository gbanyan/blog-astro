/**
 * Test records built through the real content adapter, so fixtures carry
 * exactly the fields (and derivations) production records do. Like the real
 * content, translations share their source's `slug` frontmatter.
 */
import { adaptDocument, type Page, type Post, type RawEntry } from '@/lib/content';

type Frontmatter = Partial<RawEntry['data']>;

/** A post record for the collection-relative entry id `id` (e.g. `x` or `en/x`). */
export function makePost(id: string, data: Frontmatter = {}, body = ''): Post {
  const locale = data.locale ?? (id.startsWith('en/') ? 'en' : 'zh-TW');
  const slug = id.replace(/^en\//, '');
  return adaptDocument({ id, body, data: { title: id, locale, slug, ...data } }, 'posts');
}

/** A page record for the collection-relative entry id `id`. */
export function makePage(id: string, data: Frontmatter = {}, body = ''): Page {
  const locale = data.locale ?? (id.startsWith('en/') ? 'en' : 'zh-TW');
  const slug = id.replace(/^en\//, '');
  return adaptDocument({ id, body, data: { title: id, locale, slug, ...data } }, 'pages');
}
