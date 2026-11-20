import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';


const BLOCK_TYPES = [
  'hero', 'about', 'pillars', 'services', 'sportTeaser', 'process', 'cta',
  'stats', 'statsBanner', 'context', 'quote', 'tabs', 'carousel', 'testimonial',
  'team', 'teamCarousel', 'features', 'comparison', 'story', 'values', 'focus', 'related',
] as const;

/**
 * Pages construites par blocs (src/content/pages/*.yaml).
 * Chaque bloc a un `type` qui correspond à un composant de src/components/blocks/.
 * Les champs propres à chaque bloc sont documentés dans docs/CONTENU.md.
 */
const pages = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/pages' }),
  schema: z.object({
    slug: z.string(),
    seo: z.object({
      title: z.string().max(70),
      description: z.string().max(170),
      image: z.string().optional(),
    }),
    blocks: z.array(
      z.object({ type: z.enum(BLOCK_TYPES) }).passthrough(),
    ),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    date: z.coerce.date(),
    image: z.string(),
    imageAlt: z.string().default(''),
    draft: z.boolean().default(false),
  }),
});

export const collections = { pages, blog };
