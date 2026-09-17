import { describe, expect, it } from 'vitest';
import { cjkCharCount, countWords, estimateReadingMinutes } from '@/lib/reading-time';

describe('cjkCharCount', () => {
  it('counts Han characters individually', () => {
    expect(cjkCharCount('繁體中文')).toBe(4);
  });

  it('ignores ASCII', () => {
    expect(cjkCharCount('Hello world')).toBe(0);
    expect(cjkCharCount('')).toBe(0);
  });

  it('counts CJK-block punctuation while excluding full-width forms', () => {
    // U+3002 。 is in the CJK punctuation block and counted; U+FF0C ， is a
    // full-width form (a separator, negligible reading time) and is not.
    expect(cjkCharCount('你好，世界。')).toBe(5);
  });

  it('handles mixed text', () => {
    expect(cjkCharCount('Next.js 使用心得')).toBe(4);
  });
});

describe('countWords', () => {
  it('counts Latin tokens plus CJK characters', () => {
    // 2 latin words + 4 Han chars
    expect(countWords('hello world 繁體中文')).toBe(6);
  });

  it('does not collapse a CJK paragraph into one token', () => {
    const paragraph = '這是一段沒有空格的繁體中文文章內容。';
    const latinEquivalent = 'a b c d e f g h i j k l';
    // CJK paragraph must count each char, not act like a single space-delimited word
    expect(countWords(paragraph)).toBe(cjkCharCount(paragraph));
  });

  it('returns 0 for empty input', () => {
    expect(countWords('')).toBe(0);
  });
});

describe('estimateReadingMinutes', () => {
  it('reports whole minutes for a long CJK text (300 chars/min)', () => {
    const longChinese = '醫'.repeat(900);
    expect(estimateReadingMinutes(longChinese)).toBe(3);
  });

  it('reports minutes for a long Latin text (200 wpm)', () => {
    const words = Array.from({ length: 500 }, () => 'word').join(' ');
    expect(estimateReadingMinutes(words)).toBe(3);
  });

  it('never reports zero minutes', () => {
    expect(estimateReadingMinutes('')).toBe(1);
    expect(estimateReadingMinutes('hi')).toBe(1);
  });

  it('parses CJK faster than Latin per character', () => {
    // 600 Han chars ~2 min, 600 latin chars (a single 600-char token) ~1 min
    const cjk = '醫'.repeat(600);
    expect(estimateReadingMinutes(cjk)).toBe(2);
    expect(estimateReadingMinutes('a'.repeat(600))).toBe(1);
  });
});
