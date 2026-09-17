import { access, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const relativeAsset = '107215-1180x650.jpg';
const source = path.join(root, 'content', 'assets', relativeAsset);
const target = path.join(root, 'public', 'assets', relativeAsset);

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
} catch (error) {
  console.error(`check-assets: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
