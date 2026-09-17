#!/usr/bin/env node

// Pin an explicit `translation_id` on every default-locale (zh-TW) content
// document in the `content` submodule. English documents already carry one;
// with both sides explicit, the pairing key no longer depends on file names
// matching between locales.
//
// Keys mirror the adapter's path-derived contract and the existing English
// values: `posts/<file>` / `pages/<file>`. Idempotent and BOM/CRLF-safe.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'content');
const COLLECTIONS = ['posts', 'pages'];
const EXCLUDED = new Set(['Arc 瀏覽器使用心得.md']);

function sourceKey(collection, fileName) {
  return `${collection}/${fileName.replace(/\.md$/i, '')}`;
}

async function enKeyFor(collection, fileName) {
  // Prefer mirroring the English copy's id when present, so both sides agree
  // even if a zh filename ever diverges from the en one.
  const enPath = path.join(ROOT, collection, 'en', fileName);
  try {
    const text = await readFile(enPath, 'utf8');
    const m = text.match(/^translation_id\s*:\s*(.+)$/m);
    if (m) return String(JSON.parse(m[1].trim()));
  } catch {
    // No English counterpart — fall through to path-derived key.
  }
  return sourceKey(collection, fileName);
}

async function pinFile(collection, fileName) {
  const filePath = path.join(ROOT, collection, fileName);
  const raw = await readFile(filePath, 'utf8');
  const hasBom = raw.charCodeAt(0) === 0xfeff;
  const text = hasBom ? raw.slice(1) : raw;
  const newline = text.includes('\r\n') ? '\r\n' : '\n';

  const fm = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)(\r?\n?)/);
  if (!fm) throw new Error(`No frontmatter in ${filePath}`);
  if (/^translation_(id|key)\s*:/m.test(fm[2])) return null;

  const key = (await enKeyFor(collection, fileName)) || sourceKey(collection, fileName);
  const body = fm[1] + fm[2].replace(/\s+$/, '') + newline +
    `translation_id: ${JSON.stringify(key)}` + fm[3] + '\n';
  const next = body + text.slice(fm[0].length);
  await writeFile(filePath, hasBom ? `\uFEFF${next}` : next, 'utf8');
  return key;
}

let changed = 0;
for (const collection of COLLECTIONS) {
  const dir = path.join(ROOT, collection);
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (EXCLUDED.has(entry.name)) continue;
    const key = await pinFile(collection, entry.name);
    if (key !== null) {
      changed += 1;
      console.log(`pinned ${collection}/${entry.name} -> ${key}`);
    }
  }
}
console.log(`Pinned ${changed} documents.`);
