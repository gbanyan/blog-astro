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
}

syncAssets().catch((error) => {
  console.error('sync-assets: failed to mirror assets.', error);
  process.exit(1);
});
