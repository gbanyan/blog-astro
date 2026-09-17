import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const shared = {
  locale: z.enum(['zh-TW', 'en']).default('zh-TW'),
  translation_id: z.string().optional(),
  slug: z.string().optional(),
  translation_key: z.string().optional(),
  translation_status: z.enum(['source', 'placeholder', 'translated']).optional(),
  is_placeholder: z.boolean().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  ghost_id: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  featured: z.boolean().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  published_at: z.coerce.date().optional(),
  custom_excerpt: z.string().optional(),
  authors: z.array(z.string()).optional(),
  feature_image: z.string().optional(),
};

// Entry ids are the path relative to the collection base without extension
// (e.g. `en/詩 - 弦`), mirroring Velite's flattenedPath contract. The glob
// loader's default generateId would instead use the frontmatter `slug`, which
// translation pairs share — colliding ids drop one locale from the store.
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/posts', generateId }),
  schema: z.object({ ...shared, title: z.string(), tags: z.array(z.string()).optional() }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages', generateId }),
  schema: z.object({
    ...shared,
    title: z.string(),
    tags: z.array(z.string()).optional(),
    // Page-only navigation frontmatter (verified against content/pages/);
    // not present in posts.
    nav_category: z.string().optional(),
    nav_label: z.string().optional(),
    icon: z.string().optional(),
    hero: z.string().optional(),
  }),
});

export const collections = { posts, pages };