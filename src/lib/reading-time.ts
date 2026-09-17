/**
 * CJK-aware text measurement for reading-time and wordCount schema values.
 *
 * The naive `.split(/\s+/)` count treats an entire Chinese paragraph as a
 * single "word", so these helpers count Han characters individually and
 * Latin/whitespace-delimited tokens as one word each.
 */

const CJK_RE = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const CJK_RE_G = new RegExp(CJK_RE.source, 'g');

/** Number of Han (and CJK punctuation-range) characters in `text`. */
export function cjkCharCount(text: string): number {
  let count = 0;
  for (const char of text) {
    if (CJK_RE.test(char)) count += 1;
  }
  return count;
}

/**
 * Word count usable for schema.org `wordCount`: Latin tokens plus each CJK
 * character, so both CJK and Latin-length posts report meaningful numbers.
 */
export function countWords(text: string): number {
  const cjk = cjkCharCount(text);
  const latin = text.replace(CJK_RE_G, ' ').split(/\s+/).filter(Boolean).length;
  return cjk + latin;
}

/**
 * Estimated reading time in whole minutes (minimum 1).
 * Han text is read at roughly 300 chars/min; Latin at 200 wpm.
 */
export function estimateReadingMinutes(text: string): number {
  const cjk = cjkCharCount(text);
  const latin = text.replace(CJK_RE_G, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(cjk / 300 + latin / 200));
}

/**
 * Locale-aware display label for the reading-time estimate. Kept dependency-
 * free (no dictionary import) so it is safe inside client bundles (cards).
 */
export function readingTimeLabel(minutes: number, locale: string): string {
  return locale === 'en' ? `${minutes} min read` : `${minutes} 分鐘閱讀`;
}
