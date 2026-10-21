import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

async function syncAssets() {
  const root = process.cwd();
  const sourceDir = path.join(root, 'content', 'assets');
  const targetDir = path.join(root, 'public', 'assets');

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  try {
    await stat(sourceDir);
  } catch {
    // Nothing to copy yet; leave the empty directory in place.
    console.info('sync-assets: no content/assets directory found yet.');
    return;
  }

  await cp(sourceDir, targetDir, { recursive: true, force: true });
  console.info('sync-assets: copied content/assets → public/assets.');

  // Responsive WebP variants for inline Markdown images (see content-image-variants.ts).
  const { generateInlineImageVariants } = await import('../src/lib/content-image-variants.ts');
  const count = await generateInlineImageVariants(path.join(root, 'content'), targetDir);
  console.info(`sync-assets: generated ${count} responsive WebP variants.`);
}

syncAssets().catch((error) => {
  console.error('sync-assets: failed to mirror assets.', error);
  process.exit(1);
});
