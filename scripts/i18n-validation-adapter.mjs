import { pages, posts } from '../src/lib/content.js';

const BASE_URL = 'http://localhost:3000';

function localeOf(document) {
  return document.locale === 'en' ? 'en' : 'zh-TW';
}

function translationKey(document, collection) {
  if (document.translation_id || document.translation_key) {
    return document.translation_id || document.translation_key;
  }
  return `${collection}/${document.sourcePath.replace(`${collection}/`, '').replace(/^en\//, '')}`;
}

function routeFor(document, collection) {
  const locale = localeOf(document);
  const sourcePath = document.sourcePath.replace(`${collection}/`, '').replace(/^en\//, '');
  const slug = document.slug || sourcePath;
  const base = `/${collection === 'posts' ? 'blog' : 'pages'}/${slug}`;
  return locale === 'en' ? `/en${base}` : base;
}

function pairKey(document, collection) {
  return `${collection}:${translationKey(document, collection)}`;
}

const documents = [
  ...posts.map((document) => ({ document, collection: 'posts' })),
  ...pages.map((document) => ({ document, collection: 'pages' })),
];
const byKey = new Map();
for (const entry of documents) {
  const key = pairKey(entry.document, entry.collection);
  if (!byKey.has(key)) byKey.set(key, new Map());
  byKey.get(key).set(localeOf(entry.document), entry);
}

const records = documents.map(({ document, collection }) => ({
  locale: localeOf(document),
  translationKey: pairKey(document, collection),
  route: routeFor(document, collection),
  translationStatus:
    document.translation_status || (localeOf(document) === 'en' ? 'placeholder' : 'source'),
  placeholder:
    document.is_placeholder === true ||
    (document.translation_status || (localeOf(document) === 'en' ? 'placeholder' : 'source')) ===
      'placeholder',
}));

const routes = documents.map(({ document, collection }) => {
  const locale = localeOf(document);
  const path = routeFor(document, collection);
  const pair = byKey.get(pairKey(document, collection));
  const hreflang = {};
  for (const [candidateLocale, candidate] of pair) {
    hreflang[candidateLocale] = `${BASE_URL}${routeFor(candidate.document, candidate.collection)}`;
  }
  if (hreflang['zh-TW']) hreflang['x-default'] = hreflang['zh-TW'];

  return {
    locale,
    translationKey: pairKey(document, collection),
    path,
    canonical: `${BASE_URL}${path}`,
    hreflang,
  };
});

const localeCounts = Object.fromEntries(
  ['zh-TW', 'en'].map((locale) => [
    locale,
    records.filter((record) => record.locale === locale).length,
  ])
);

const validationData = {
  records,
  routes,
  expected: {
    localeCounts,
    routeCounts: localeCounts,
    routeCount: records.length,
  },
};

export default validationData;
