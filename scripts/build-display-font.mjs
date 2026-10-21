#!/usr/bin/env node
/**
 * Build-time subset of the CJK display font (LXGW WenKai TC).
 *
 * The display stack (`--font-display-latin`, `--font-display-cjk`) is only
 * used by headings, the site title and post-title links (`.type-display`,
 * `.type-title`, `.type-subtitle`, `.font-editorial`, `.prose h1/h2`). Instead
 * of the Astro Fonts API's 108 unicode-range slices per weight (≈211 KB of
 * inline @font-face on every page), this script collects every character that
 * can be rendered in those elements and asks Google Fonts for ONE woff2 that
 * contains exactly those glyphs (`css2?...&text=`).
 *
 * Character sources (deliberately a superset, glyphs are cheap):
 *   - content/{posts,pages}/**.md: frontmatter `title` + `tags`, Markdown
 *     headings (all levels)
 *   - every character in src/{pages,layouts,lib/i18n}/** and src/lib/config.ts
 *     (dictionary UI strings, page-level strings, defaults). Components take
 *     their UI text from the dictionaries; scanning them would only add
 *     decorative glyphs (e.g. half-width katakana) never set in this font.
 *   - PUBLIC_SITE_* values from the environment / .env.local
 * Characters the Latin face (Cormorant Garamond, latin subset) already covers
 * are dropped. Anything missing at runtime falls back per glyph to the next
 * family in the stack ("Songti SC", serif).
 *
 * Outputs (all git-ignored):
 *   public/fonts/lxgw-wenkai-tc-<weight>-<contenthash>.woff2  (immutable)
 *   node_modules/.cache/display-font/manifest.json  (read by src/lib/display-font.ts)
 * Cache: node_modules/.cache/display-font/<charset-hash>.{woff2,json}; the
 * network is hit only when the character set changes.
 *
 * Failure policy: in CI (`CI` env set) a failed download fails the build, so
 * a deploy never silently loses the heading font. Locally it warns and keeps
 * the previous subset (or none: headings then use the fallback serif).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const root = process.cwd();
const FAMILY = 'LXGW WenKai TC';
// Every display-font usage is semibold/bold (600/700 → the 700 face); no
// element renders the CJK display font at 400/500, so only 700 ships. Add 400
// here if a regular-weight display heading is introduced.
const WEIGHTS = [700];
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const CACHE_DIR = path.join(root, 'node_modules', '.cache', 'display-font');
const MANIFEST = path.join(CACHE_DIR, 'manifest.json');
const PUBLIC_DIR = path.join(root, 'public', 'fonts');
const FILE_PREFIX = 'lxgw-wenkai-tc-';
// Cormorant Garamond's latin subset unicode-range (see the Astro Fonts output);
// glyphs in these ranges never reach the CJK family.
const LATIN_RANGES = [
  [0x0000, 0x00ff], [0x0131, 0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc],
  [0x02c6, 0x02c6], [0x02da, 0x02da], [0x02dc, 0x02dc], [0x0304, 0x0304],
  [0x0308, 0x0308], [0x0329, 0x0329], [0x2000, 0x206f], [0x20ac, 0x20ac],
  [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212],
  [0x2215, 0x2215], [0xfeff, 0xfeff], [0xfffd, 0xfffd],
];

async function walk(dir, extensions) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, extensions)));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

function readEnvFile() {
  const file = path.join(root, '.env.local');
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*(PUBLIC_[A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

async function collectText() {
  const parts = [];
  for (const base of ['content/posts', 'content/pages']) {
    for (const file of await walk(path.join(root, base), ['.md'])) {
      const { data, content } = matter(await readFile(file, 'utf8'));
      if (typeof data.title === 'string') parts.push(data.title);
      if (Array.isArray(data.tags)) parts.push(data.tags.join(' '));
      for (const line of content.split('\n')) {
        if (/^\s{0,3}#{1,6}\s/.test(line)) parts.push(line);
      }
    }
  }
  for (const base of ['src/pages', 'src/layouts', 'src/lib/i18n']) {
    for (const file of await walk(path.join(root, base), ['.astro', '.ts', '.tsx'])) {
      parts.push(await readFile(file, 'utf8'));
    }
  }
  parts.push(await readFile(path.join(root, 'src/lib/config.ts'), 'utf8'));
  const env = { ...readEnvFile(), ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('PUBLIC_SITE_') && value) parts.push(value);
  }
  return parts.join('\n');
}

function charset(text) {
  const codepoints = new Set();
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (/\s/u.test(char) || /\p{Cc}|\p{Cf}|\p{Cs}|\p{Co}/u.test(char)) continue;
    if (LATIN_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) continue;
    codepoints.add(cp);
  }
  return [...codepoints].sort((a, b) => a - b);
}

/**
 * Collapses Google's per-glyph unicode-range into a few coarse ranges: the
 * browser only needs it to skip the download on pages without CJK headings
 * (English pages), and a 5 KB per-glyph list would be inlined on every page.
 * Glyphs inside a coarse range but absent from the subset fall back per glyph.
 */
function coarseRange(unicodeRange, maxGap = 0x400) {
  const spans = unicodeRange.split(',').map((part) => {
    const [lo, hi = lo] = part.replace(/^U\+/i, '').split('-');
    return [parseInt(lo, 16), parseInt(hi, 16)];
  }).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [lo, hi] of spans) {
    const last = merged.at(-1);
    if (last && lo - last[1] <= maxGap) last[1] = Math.max(last[1], hi);
    else merged.push([lo, hi]);
  }
  const hex = (cp) => cp.toString(16).toUpperCase();
  return merged.map(([lo, hi]) => (lo === hi ? `U+${hex(lo)}` : `U+${hex(lo)}-${hex(hi)}`)).join(',');
}

const sha = (data) => createHash('sha256').update(data).digest('hex');

async function fetchOk(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url.slice(0, 120)}`);
  return response;
}

/** Downloads one subset woff2 per weight; returns [{ weight, bytes, unicodeRange }]. */
async function download(text) {
  const family = FAMILY.replace(/ /g, '+');
  const url =
    `https://fonts.googleapis.com/css2?family=${family}:wght@${WEIGHTS.join(';')}` +
    `&text=${encodeURIComponent(text)}&display=swap`;
  const css = await (await fetchOk(url, { headers: { 'User-Agent': UA } })).text();
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
    weight: Number(body.match(/font-weight:\s*(\d+)/)?.[1]),
    src: body.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)?.[1],
    unicodeRange: body.match(/unicode-range:\s*([^;]+);/)?.[1].replace(/\s+/g, ''),
  }));
  const results = [];
  for (const weight of WEIGHTS) {
    const face = faces.find((candidate) => candidate.weight === weight);
    if (!face?.src) throw new Error(`Google Fonts CSS has no woff2 face for weight ${weight}`);
    const bytes = Buffer.from(await (await fetchOk(face.src)).arrayBuffer());
    if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2') {
      throw new Error(`weight ${weight} download is not a woff2 file`);
    }
    results.push({ weight, bytes, unicodeRange: face.unicodeRange });
  }
  return results;
}

async function main() {
  const codepoints = charset(await collectText());
  const text = String.fromCodePoint(...codepoints);
  const key = sha(`${FAMILY}|${WEIGHTS.join(',')}|${UA}|${text}`).slice(0, 16);
  await mkdir(CACHE_DIR, { recursive: true });

  let faces;
  const cacheMeta = path.join(CACHE_DIR, `${key}.json`);
  if (existsSync(cacheMeta)) {
    const meta = JSON.parse(await readFile(cacheMeta, 'utf8'));
    faces = await Promise.all(meta.map(async (face) => ({
      ...face,
      bytes: await readFile(path.join(CACHE_DIR, `${key}-${face.weight}.woff2`)),
    })));
    console.info(`display-font: cache hit (${codepoints.length} glyphs, key ${key}).`);
  } else {
    try {
      faces = await download(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (process.env.CI) {
        console.error(`display-font: subset download failed in CI: ${message}`);
        process.exit(1);
      }
      console.warn(`display-font: download failed (${message}); keeping the previous subset if any.`);
      return;
    }
    for (const face of faces) {
      await writeFile(path.join(CACHE_DIR, `${key}-${face.weight}.woff2`), face.bytes);
    }
    await writeFile(cacheMeta, JSON.stringify(faces.map(({ weight, unicodeRange }) => ({ weight, unicodeRange }))));
    console.info(`display-font: downloaded subset for ${codepoints.length} glyphs (key ${key}).`);
  }

  await mkdir(PUBLIC_DIR, { recursive: true });
  for (const file of await readdir(PUBLIC_DIR)) {
    if (file.startsWith(FILE_PREFIX)) await rm(path.join(PUBLIC_DIR, file));
  }
  const manifest = { family: `${FAMILY} Subset`, glyphs: codepoints.length, faces: [] };
  for (const face of faces) {
    const name = `${FILE_PREFIX}${face.weight}-${sha(face.bytes).slice(0, 12)}.woff2`;
    await writeFile(path.join(PUBLIC_DIR, name), face.bytes);
    manifest.faces.push({
      weight: face.weight,
      href: `/fonts/${name}`,
      bytes: face.bytes.length,
      unicodeRange: coarseRange(face.unicodeRange),
    });
    console.info(`display-font: /fonts/${name} (${face.bytes.length} bytes, weight ${face.weight}).`);
  }
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
}

await main();
