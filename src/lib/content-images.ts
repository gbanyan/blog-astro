import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { Post } from './content';
import { contentAssetPath, contentAssetSize } from './content-assets';
import { postCoverSrc, toPostListEntry } from './post-list';
import type { PostListEntry, PostListThumbnail } from './post-list';

// Source images stay in the content submodule; Astro generates hashed WebP
// variants during the build, with no image service or Worker execution cost.
//
// Lazy glob: every match becomes an image module whose original is emitted
// into `_astro/`. Astro deletes an emitted original after the build only when
// it was transformed AND never "referenced" — and reading any property of the
// imported metadata proxy (e.g. `image.width`) counts as a reference. So the
// metadata objects must only ever be handed to `getImage()` / `<Image>`;
// intrinsic sizes are read from disk instead (`contentAssetSize`).
const images = import.meta.glob<{ default: ImageMetadata }>(
  '/content/assets/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG}'
);

/** Astro image metadata for a local content asset (`/assets/...`), if optimizable. */
export async function loadContentImage(src: string): Promise<ImageMetadata | undefined> {
  const load = images[`/content${contentAssetPath(src)}`];
  return load ? (await load()).default : undefined;
}

// List thumbnails render in a 96×96 box (mobile) / 160px-wide box stretched to
// the card height (≥640px), both `object-cover`. Variants are pre-cropped to
// 4:3, so the rendered image width is ~128px (mobile) and ~200px (desktop);
// candidates cover 1x and 2x of both (`POST_THUMBNAIL_SIZES`).
const THUMB_WIDTHS = [160, 256, 320, 400];
const THUMB_ASPECT = 4 / 3;

const thumbnailCache = new Map<string, Promise<PostListThumbnail | undefined>>();

/** Build-time WebP thumbnail srcset for a post cover; original as fallback. */
export function getPostThumbnail(src: string | undefined): Promise<PostListThumbnail | undefined> {
  if (!src) return Promise.resolve(undefined);
  const normalized = contentAssetPath(src);
  let pending = thumbnailCache.get(normalized);
  if (!pending) {
    pending = createThumbnail(normalized);
    thumbnailCache.set(normalized, pending);
  }
  return pending;
}

async function createThumbnail(src: string): Promise<PostListThumbnail> {
  const fallback: PostListThumbnail = { src, width: 320, height: 240 };
  const image = await loadContentImage(src);
  const size = contentAssetSize(src);
  if (!image || !size) return fallback;

  const width = THUMB_WIDTHS[THUMB_WIDTHS.length - 1];
  const result = await getImage({
    src: image,
    width,
    height: Math.round(width / THUMB_ASPECT),
    widths: THUMB_WIDTHS,
    fit: 'cover',
    format: 'webp',
    quality: 75,
  });
  return {
    src: result.src,
    srcset: result.srcSet.attribute || undefined,
    width: Number(result.attributes.width) || width,
    height: Number(result.attributes.height) || Math.round(width / THUMB_ASPECT),
  };
}

/** Slim list entries (with optimized thumbnails) for the post list island. */
export async function getPostListEntries(posts: Post[]): Promise<PostListEntry[]> {
  return Promise.all(
    posts.map(async (post) => toPostListEntry(post, await getPostThumbnail(postCoverSrc(post))))
  );
}
