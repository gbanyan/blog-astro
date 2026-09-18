import assert from 'node:assert/strict';

// Run against `wrangler dev`, or pass the production origin after deployment.
const origin = process.argv[2] ?? 'http://127.0.0.1:4413';
const request = (path, options) => fetch(new URL(path, origin), {
  redirect: 'manual',
  signal: AbortSignal.timeout(20000),
  ...options,
});
const immutable = 'public, max-age=31536000, immutable';
const revalidate = 'public, max-age=0, must-revalidate';

for (const path of ['/blog/ai-taste-llm-data-shadow', '/en/blog/ai-taste-llm-data-shadow', '/pages/homelab']) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} should not redirect`);
  assert.equal(response.headers.get('cache-control'), revalidate, `${path} HTML must revalidate`);
  const slash = await request(`${path}/?delivery-check=1`);
  assert.equal(slash.status, 307);
  const location = new URL(slash.headers.get('location'), origin);
  assert.equal(location.pathname, path);
  assert.equal(location.search, '?delivery-check=1');
}

const html = await (await request('/blog/ai-taste-llm-data-shadow')).text();
const font = html.match(/\/_astro\/fonts\/[\w.-]+\.woff2/)?.[0];
const image = html.match(/\/_astro\/ai-taste-llm-data-shadow\.[\w.-]+\.webp/)?.[0];
assert.ok(font, 'page should reference a self-hosted font');
assert.ok(image, 'cover should use a build-time optimized image');
assert.match(html, /srcset="[^"]+480w[^"]+1200w/, 'cover needs responsive variants');

for (const path of [font, image]) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('cache-control'), immutable, path);
  assert.ok(response.headers.get('etag'), `${path} needs an ETag`);
  await response.arrayBuffer();
}
for (const path of ['/assets/ai-taste-llm-data-shadow.jpg', '/_pagefind/pagefind.js', '/og/index/en.png']) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('cache-control'), revalidate, path);
  await response.arrayBuffer();
}
for (const path of ['/delivery-check-does-not-exist', '/_astro/delivery-check-does-not-exist.js']) {
  assert.equal((await request(path)).status, 404, `${path} must not fall through to the old origin or homepage`);
}
console.log(`Delivery checks passed: ${origin} (canonical routes, responsive images, cache policies, real 404s).`);
