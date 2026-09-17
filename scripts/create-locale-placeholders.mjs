import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'content');
const collections = ['posts', 'pages'];
const excluded = new Set(['Arc 瀏覽器使用心得.md']);

for (const collection of collections) {
  const sourceDir = path.join(root, collection);
  const targetDir = path.join(sourceDir, 'en');
  await mkdir(targetDir, { recursive: true });

  const names = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !excluded.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const name of names) {
    const sourcePath = path.join(sourceDir, name);
    const targetPath = path.join(targetDir, name);
    const source = await readFile(sourcePath, 'utf8');
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const opening = `---${newline}`;
    if (!source.startsWith(opening)) {
      throw new Error(`Expected frontmatter in ${sourcePath}`);
    }

    const translationId = `${collection}/${name.slice(0, -3)}`;
    const metadata =
      `locale: en${newline}` +
      `translation_id: ${JSON.stringify(translationId)}${newline}` +
      `translation_status: placeholder${newline}` +
      `is_placeholder: true${newline}`;
    await writeFile(targetPath, `${opening}${metadata}${source.slice(opening.length)}`);
  }
}

console.log('Created deterministic English placeholder copies for posts and pages.');
