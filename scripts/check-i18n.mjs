#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_LOCALES = ['zh-TW', 'en'];
const DEFAULT_DATA_DIR = '.velite';
const DEFAULT_MANIFEST = '.velite/i18n-validation.json';
const DEFAULT_ADAPTER = 'scripts/i18n-validation-adapter.mjs';
const DEFAULT_OUTPUTS = {
  sitemap: '/sitemap.xml',
  feed: '/feed.xml',
  llms: '/llms.txt',
};

function usage() {
  console.log(`Usage: node scripts/check-i18n.mjs [options]

Inputs (choose one, or use direct .velite discovery):
  --manifest <file>             JSON validation snapshot
  --adapter <file>              ESM module exporting data or a factory
  --data-dir <directory>        Generated Velite directory (default: .velite)

Optional checks:
  --expected-routes <count>     Pin the total localized route count
  --expected-locale-count <locale=count>
                                Pin a locale's generated record count (repeatable)
  --smoke <base-url>             Fetch localized routes and sitemap/feed/llms output
  --help

The command intentionally does not require package.json or third-party modules.
`);
}

function parseArgs(argv) {
  const options = {
    dataDir: DEFAULT_DATA_DIR,
    manifest: null,
    adapter: null,
    expectedRoutes: null,
    expectedLocaleCounts: {},
    smoke: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    const [flag, inlineValue] = argument.split('=', 2);
    const needsValue = new Set([
      '--data-dir',
      '--manifest',
      '--adapter',
      '--expected-routes',
      '--expected-locale-count',
      '--smoke',
    ]);
    if (!needsValue.has(flag)) {
      throw new Error(`Unknown option: ${argument}`);
    }

    const value = inlineValue ?? argv[++index];
    if (!value) throw new Error(`${flag} requires a value`);

    if (flag === '--data-dir') options.dataDir = value;
    if (flag === '--manifest') options.manifest = value;
    if (flag === '--adapter') options.adapter = value;
    if (flag === '--expected-routes') options.expectedRoutes = parseCount(value, flag);
    if (flag === '--smoke') options.smoke = value;
    if (flag === '--expected-locale-count') {
      const separator = value.indexOf('=');
      if (separator < 1) throw new Error(`${flag} expects locale=count`);
      const locale = normalizeLocale(value.slice(0, separator));
      options.expectedLocaleCounts[locale] = parseCount(value.slice(separator + 1), flag);
    }
  }

  if (options.manifest && options.adapter) {
    throw new Error('Use either --manifest or --adapter, not both');
  }
  return options;
}

function parseCount(value, flag) {
  if (!/^\d+$/.test(value)) throw new Error(`${flag} expects a non-negative integer`);
  return Number(value);
}

function normalizeLocale(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace('_', '-');
  if (normalized.toLowerCase() === 'zh-tw') return 'zh-TW';
  if (normalized.toLowerCase() === 'en' || normalized.toLowerCase() === 'en-us') return 'en';
  return normalized;
}

function asString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstString(...values) {
  return values.map(asString).find(Boolean) ?? null;
}

function recordLocale(record) {
  return normalizeLocale(
    firstString(
      record.locale,
      record.lang,
      record.language,
      record.i18n?.locale,
      record.translation?.locale
    )
  );
}

function recordKey(record) {
  return firstString(
    record.translationKey,
    record.translation_key,
    record.translationId,
    record.translation_id,
    record.translation?.key,
    record.i18n?.key,
    record.canonicalId,
    record.canonical_id,
    record.id
  );
}

function recordRoute(record) {
  const route = record.route;
  return firstString(
    typeof route === 'string' ? route : route?.path,
    record.path,
    record.url,
    record.href
  );
}

function looksLikeRecord(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    ['title', 'sourcePath', 'slug', 'locale', 'translationKey', 'translation_id', 'route', 'url'].some(
      (field) => field in value
    )
  );
}

function collectRecordArrays(value, result, depth = 0) {
  if (depth > 5 || value == null) return;
  if (Array.isArray(value)) {
    if (value.some(looksLikeRecord)) result.push(...value.filter(looksLikeRecord));
    return;
  }
  if (typeof value !== 'object') return;
  for (const child of Object.values(value)) collectRecordArrays(child, result, depth + 1);
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read JSON ${file}: ${error.message}`);
  }
}

async function findJsonFiles(directory) {
  const files = [];
  async function walk(current, depth = 0) {
    if (depth > 3) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(file, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(file);
    }
  }
  await walk(directory);
  return files;
}

async function loadVeliteData(dataDir) {
  const jsonFiles = await findJsonFiles(dataDir);
  const records = [];
  for (const file of jsonFiles) collectRecordArrays(await readJson(file), records);

  if (records.length > 0) {
    return { records: dedupeRecords(records), routes: null, expected: {}, outputs: {}, source: `Velite JSON in ${dataDir}` };
  }

  const indexFile = path.join(dataDir, 'index.js');
  if (existsSync(indexFile)) {
    const mod = await import(`${pathToFileURL(path.resolve(indexFile)).href}?checkI18n=${Date.now()}`);
    const moduleRecords = [];
    collectRecordArrays(mod, moduleRecords);
    if (moduleRecords.length > 0) {
      return { records: dedupeRecords(moduleRecords), routes: null, expected: {}, outputs: {}, source: indexFile };
    }
  }

  throw new Error(`No generated Velite records found in ${dataDir}. Run the content generator first, or pass --manifest/--adapter.`);
}

function dedupeRecords(records) {
  const seen = new Set();
  return records.filter((record) => {
    const identity = JSON.stringify([
      record.locale,
      record.translationKey,
      record.translation_id,
      record.id,
      record.sourcePath,
      record.url,
      record.route,
    ]);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

async function loadAdapter(file) {
  const mod = await import(`${pathToFileURL(path.resolve(file)).href}?checkI18n=${Date.now()}`);
  const exported = mod.default ?? mod.getI18nValidationData ?? mod.getI18nValidationSnapshot;
  const value = typeof exported === 'function' ? await exported() : exported;
  if (!value || typeof value !== 'object') throw new Error(`Adapter ${file} did not return an object`);
  return { ...value, source: `adapter ${file}` };
}

function normalizePayload(payload) {
  const records = Array.isArray(payload) ? payload : payload.records ?? payload.documents;
  if (!Array.isArray(records)) {
    throw new Error('Validation input must expose a records array');
  }
  return {
    records,
    routes: Array.isArray(payload.routes) ? payload.routes : null,
    expected: payload.expected && typeof payload.expected === 'object' ? payload.expected : {},
    outputs: payload.outputs && typeof payload.outputs === 'object' ? payload.outputs : {},
    source: payload.source ?? 'validation input',
  };
}

function normalizeRecord(raw, index) {
  const locale = recordLocale(raw);
  const key = recordKey(raw);
  const route = recordRoute(raw);
  return {
    raw,
    index,
    locale,
    key,
    route,
    placeholder:
      raw.placeholder === true ||
      raw.isPlaceholder === true ||
      raw.is_placeholder === true ||
      raw.translationStatus === 'placeholder' ||
      raw.translation_status === 'placeholder',
    missingTranslation: raw.missingTranslation === true || raw.translationMissing === true,
  };
}

function normalizeRoute(raw, index, records) {
  const key = firstString(raw.translationKey, raw.translation_key, raw.translationId, raw.translation_id, raw.key);
  const locale = normalizeLocale(firstString(raw.locale, raw.lang, raw.language));
  const route = firstString(typeof raw.route === 'string' ? raw.route : raw.route?.path, raw.path, raw.url, raw.href);
  const matchingRecord = records.find((record) => record.key === key && record.locale === locale && record.route === route);
  return {
    raw,
    index,
    locale: locale ?? matchingRecord?.locale ?? null,
    key: key ?? matchingRecord?.key ?? null,
    route: route ?? matchingRecord?.route ?? null,
    canonical: firstString(raw.canonical, raw.canonicalUrl, raw.canonical_url),
    hreflang: raw.hreflang ?? raw.alternates ?? null,
  };
}

function routeUrl(route, baseUrl) {
  try {
    const url = new URL(route, baseUrl);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    return { url, pathname, identity: `${url.origin}${pathname}` };
  } catch {
    return null;
  }
}

function checkPayload(payload, options) {
  const errors = [];
  const notes = [];
  const records = payload.records.map(normalizeRecord);
  const baseUrl = options.smoke ?? 'http://localhost:3000';
  const groups = new Map();
  const countByLocale = new Map();

  const fail = (message) => errors.push(message);
  const note = (message) => notes.push(message);

  if (records.length === 0) fail('records is empty');
  for (const record of records) {
    if (!record.locale) fail(`record ${record.index} has no locale`);
    else countByLocale.set(record.locale, (countByLocale.get(record.locale) ?? 0) + 1);
    if (!record.key) fail(`record ${record.index} has no stable translationKey`);
    if (!record.route) fail(`record ${record.index} has no route/path/url`);
    if (record.key) {
      if (!groups.has(record.key)) groups.set(record.key, []);
      groups.get(record.key).push(record);
    }
  }

  for (const locale of REQUIRED_LOCALES) {
    const count = countByLocale.get(locale) ?? 0;
    if (count === 0) fail(`generated Velite data has no ${locale} records`);
    const expected = options.expectedLocaleCounts[locale] ?? payload.expected.localeCounts?.[locale];
    if (expected != null && count !== Number(expected)) {
      fail(`${locale} record count is ${count}; expected ${expected}`);
    }
  }

  for (const [key, group] of groups) {
    const byLocale = new Map();
    for (const record of group) {
      if (byLocale.has(record.locale)) fail(`translationKey ${key} has duplicate ${record.locale} records`);
      byLocale.set(record.locale, record);
      if (record.missingTranslation && record.locale === 'en') {
        fail(`translationKey ${key} marks an English record as missing`);
      }
    }
    if (!byLocale.has('zh-TW')) fail(`translationKey ${key} has an English record but no zh-TW record`);
  }

  const routeInputs = payload.routes ?? records.filter((record) => record.route).map((record) => record.raw);
  const routes = routeInputs.map((raw, index) => normalizeRoute(raw, index, records));
  const routeIdentities = new Map();
  const routeCountByLocale = new Map();

  for (const route of routes) {
    if (!route.locale) fail(`route ${route.index} has no locale`);
    if (!route.key) fail(`route ${route.index} has no stable translationKey`);
    if (!route.route) fail(`route ${route.index} has no path/url`);
    const normalized = route.route ? routeUrl(route.route, baseUrl) : null;
    if (!normalized) {
      fail(`route ${route.index} has an invalid path/url: ${route.route}`);
      continue;
    }
    if (routeIdentities.has(normalized.identity)) {
      const previous = routeIdentities.get(normalized.identity);
      fail(`duplicate route collision: ${route.route} (${previous.route})`);
    } else {
      routeIdentities.set(normalized.identity, route);
    }
    if (route.locale) routeCountByLocale.set(route.locale, (routeCountByLocale.get(route.locale) ?? 0) + 1);

    const group = groups.get(route.key);
    if (!group) fail(`route ${route.route} points to unknown translationKey ${route.key}`);
    const record = group?.find((candidate) => candidate.locale === route.locale);
    if (!record) fail(`route ${route.route} has no matching ${route.locale} record for ${route.key}`);

    if (route.canonical) {
      const canonical = routeUrl(route.canonical, baseUrl);
      if (!canonical) fail(`route ${route.route} has an invalid canonical URL`);
      else if (canonical.pathname !== normalized.pathname) fail(`canonical mismatch for ${route.route}: ${route.canonical}`);
    }
    if (route.hreflang && typeof route.hreflang === 'object' && !Array.isArray(route.hreflang)) {
      const localesInGroup = new Set(group?.map((candidate) => candidate.locale) ?? []);
      for (const [hreflang, href] of Object.entries(route.hreflang)) {
        if (hreflang === 'x-default') continue;
        const normalizedLocale = normalizeLocale(hreflang);
        if (!localesInGroup.has(normalizedLocale)) fail(`hreflang ${hreflang} on ${route.route} has no translation record`);
        if (!asString(href)) fail(`hreflang ${hreflang} on ${route.route} has no URL`);
      }
      if (!route.hreflang[route.locale]) fail(`hreflang on ${route.route} has no self link for ${route.locale}`);
    }

  }

  for (const [key, group] of groups) {
    const hasEnglish = group.some((record) => record.locale === 'en');
    const englishRoutes = routes.filter((route) => route.key === key && route.locale === 'en');
    if (!hasEnglish && englishRoutes.length > 0) {
      fail(`missing English translation ${key} still has an English route`);
    }
    if (hasEnglish && englishRoutes.length !== 1) {
      fail(`${key} has an English record but ${englishRoutes.length} English routes`);
    }
  }

  const totalExpected = options.expectedRoutes ?? payload.expected.routeCount ?? payload.expected.total;
  const derivedExpected = records.filter((record) => record.route).length;
  if (routes.length !== derivedExpected) {
    fail(`route count is ${routes.length}; expected one route per routable record (${derivedExpected})`);
  }
  if (totalExpected != null && routes.length !== Number(totalExpected)) {
    fail(`route count is ${routes.length}; expected ${totalExpected}`);
  } else if (totalExpected == null) {
    note(`route count: ${routes.length} (derived from routable records; pin it with --expected-routes or expected.routeCount)`);
  }
  const expectedRouteCounts = payload.expected.routeCounts ?? {};
  for (const locale of Object.keys(expectedRouteCounts)) {
    const actual = routeCountByLocale.get(normalizeLocale(locale)) ?? 0;
    if (actual !== Number(expectedRouteCounts[locale])) fail(`${locale} route count is ${actual}; expected ${expectedRouteCounts[locale]}`);
  }

  return { errors, notes, records, routes, groups, routeIdentities, outputs: { ...DEFAULT_OUTPUTS, ...payload.outputs }, baseUrl };
}

function attributes(tag) {
  const values = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) values[match[1].toLowerCase()] = match[2];
  return values;
}

function inspectHtml(html) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const canonical = links.find((link) => link.rel?.toLowerCase().split(/\s+/).includes('canonical'))?.href ?? null;
  const alternates = new Map(
    links
      .filter((link) => link.rel?.toLowerCase().split(/\s+/).includes('alternate') && link.hreflang && link.href)
      .map((link) => [normalizeLocale(link.hreflang) ?? link.hreflang, link.href])
  );
  return { canonical, alternates };
}

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

async function fetchText(url, label) {
  let response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch (error) {
    throw new Error(`${label} could not be fetched: ${error.message}`);
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return { response, text };
}

async function smokeTest(result, payload) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const base = new URL(result.baseUrl);
  const makeUrl = (value) => new URL(value, base).href;
  const pathFor = (route) => routeUrl(route.route, result.baseUrl)?.pathname ?? route.route;

  for (const route of result.routes) {
    const group = result.groups.get(route.key) ?? [];
    const expectedLocales = new Set(group.map((record) => record.locale));
    const url = makeUrl(pathFor(route));
    try {
      const { text } = await fetchText(url, `route ${route.route}`);
      const inspected = inspectHtml(text);
      const routeRecord = result.groups.get(route.key)?.find((candidate) => candidate.locale === route.locale);
      if (routeRecord?.placeholder && !/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(text)) {
        fail(`placeholder route ${route.route} is missing a noindex robots directive`);
      }
      if (!inspected.canonical) fail(`route ${route.route} has no canonical link`);
      else if (new URL(inspected.canonical, url).pathname.replace(/\/+$/, '') !== new URL(url).pathname.replace(/\/+$/, '')) {
        fail(`route ${route.route} canonical link points to ${inspected.canonical}`);
      }
      for (const locale of expectedLocales) if (!inspected.alternates.has(locale)) fail(`route ${route.route} has no ${locale} hreflang link`);
      if (!expectedLocales.has('en') && inspected.alternates.has('en')) fail(`route ${route.route} exposes an English hreflang without an English translation`);
    } catch (error) {
      fail(error.message);
    }
  }

  const outputChecks = [
    ['sitemap', /<urlset\b|<sitemapindex\b/i, 'sitemap XML'],
    ['feed', /<rss\b/i, 'RSS XML'],
    ['llms', /^\s*#/m, 'llms.txt markdown'],
  ];
  for (const [name, marker, label] of outputChecks) {
    const configured = result.outputs[name] ?? DEFAULT_OUTPUTS[name];
    const outputUrl = typeof configured === 'object' ? configured.url ?? configured.path : configured;
    try {
      const { response, text } = await fetchText(makeUrl(outputUrl), label);
      if (!marker.test(text)) fail(`${label} did not contain the expected marker`);
      if (name === 'sitemap') {
        const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1]);
        for (const route of result.routes) {
          const record = result.groups.get(route.key)?.find((candidate) => candidate.locale === route.locale);
          if (record?.placeholder) continue;
          const expectedPath = new URL(pathFor(route), result.baseUrl).pathname;
          if (!locs.some((loc) => new URL(loc).pathname === expectedPath)) fail(`sitemap is missing ${route.route}`);
        }
        const expectedCount = payload.expected.sitemapCount;
        if (expectedCount != null && locs.length !== Number(expectedCount)) fail(`sitemap has ${locs.length} URLs; expected ${expectedCount}`);
      }
      if (name === 'feed') {
        const expectedCount = payload.expected.feedItemCount;
        const itemCount = countMatches(text, /<item\b/gi);
        if (expectedCount != null && itemCount !== Number(expectedCount)) fail(`feed has ${itemCount} items; expected ${expectedCount}`);
      }
      if (name === 'llms') {
        for (const route of result.routes.filter((candidate) => candidate.locale === 'en')) {
          const record = result.groups.get(route.key)?.find((candidate) => candidate.locale === route.locale);
          if (record?.placeholder) continue;
          const routePath = new URL(pathFor(route), result.baseUrl).pathname;
          if (!text.includes(routePath)) fail(`llms.txt is missing English route ${routePath}`);
        }
      }
      void response;
    } catch (error) {
      fail(error.message);
    }
  }
  return errors;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  let payload;
  if (options.adapter) payload = await loadAdapter(options.adapter);
  else if (options.manifest) payload = { ...(await readJson(path.resolve(options.manifest))), source: `manifest ${options.manifest}` };
  else if (existsSync(path.resolve(DEFAULT_MANIFEST))) payload = { ...(await readJson(path.resolve(DEFAULT_MANIFEST))), source: `manifest ${DEFAULT_MANIFEST}` };
  else if (existsSync(path.resolve(DEFAULT_ADAPTER))) payload = await loadAdapter(DEFAULT_ADAPTER);
  else payload = await loadVeliteData(path.resolve(options.dataDir));

  const result = checkPayload(normalizePayload(payload), options);
  if (options.smoke) result.errors.push(...(await smokeTest(result, normalizePayload(payload))));

  console.log(`check-i18n: ${result.errors.length ? 'FAIL' : 'PASS'} (${payload.source})`);
  for (const note of result.notes) console.log(`  note: ${note}`);
  if (options.smoke) console.log(`  smoke: ${options.smoke}`);
  for (const error of result.errors) console.error(`  error: ${error}`);
  if (result.errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check-i18n: ERROR: ${error.message}`);
  process.exitCode = 1;
});
