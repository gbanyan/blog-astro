import { access, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const relativeAsset = '107215-1180x650.jpg';
const source = path.join(root, 'content', 'assets', relativeAsset);
const target = path.join(root, 'public', 'assets', relativeAsset);

/** PUBLIC_OG_DEFAULT_IMAGE from the environment or .env.local (CI writes it there). */
async function configuredOgImage() {
  if (process.env.PUBLIC_OG_DEFAULT_IMAGE !== undefined) return process.env.PUBLIC_OG_DEFAULT_IMAGE;
  const envFile = path.join(root, '.env.local');
  if (!existsSync(envFile)) return '';
  const match = (await readFile(envFile, 'utf8')).match(/^\s*PUBLIC_OG_DEFAULT_IMAGE\s*=\s*"?([^"\n]*)"?\s*$/m);
  return match?.[1].trim() ?? '';
}

try {
  await access(source);
  await access(target);
  const [sourceStats, targetStats] = await Promise.all([stat(source), stat(target)]);

  if (!sourceStats.isFile() || !targetStats.isFile()) {
    throw new Error('the representative asset is not a regular file');
  }
  if (sourceStats.size !== targetStats.size) {
    throw new Error(
      `size mismatch for ${relativeAsset}: source=${sourceStats.size}, target=${targetStats.size}`,
    );
  }

  console.info(`check-assets: ${relativeAsset} is mirrored in public/assets.`);

  // The default social card should resolve. Unset = the build-time
  // /og/index/<locale>.png cards; a site-relative override should exist in
  // public/ (after sync-assets). Absolute URLs are not fetched.
  const ogImage = await configuredOgImage();
  if (ogImage && !/^https?:\/\//.test(ogImage)) {
    const generated = /^\/og\/index\/(zh-TW|en)\.png$/.test(ogImage);
    if (!generated && !existsSync(path.join(root, 'public', ogImage))) {
      // og.ts falls back to the generated cards, so warn rather than fail the build.
      console.warn(
        `check-assets: PUBLIC_OG_DEFAULT_IMAGE=${ogImage} does not exist in public/; using the ` +
          'build-time /og/index/<locale>.png cards. Remove the variable or point it at an existing file.',
      );
    } else {
      console.info(`check-assets: default OG image ${ogImage} resolves.`);
    }
  } else {
    console.info(`check-assets: default OG image ${ogImage || '/og/index/<locale>.png (generated)'} resolves.`);
  }
} catch (error) {
  console.error(`check-assets: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
