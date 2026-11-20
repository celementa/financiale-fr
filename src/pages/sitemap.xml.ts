import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const pages = await getCollection('pages');
  const posts = await getCollection('blog', (p) => !p.data.draft);
  const urls = [
    ...pages.map((p) => ({ loc: `/${p.data.slug}`, lastmod: undefined as string | undefined })),
    { loc: '/contact', lastmod: undefined },
    { loc: '/blog', lastmod: undefined },
    { loc: '/mentions-legales', lastmod: undefined },
    ...posts.map((p) => ({ loc: `/blog/${p.id}`, lastmod: p.data.date.toISOString().slice(0, 10) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc === '/' ? site!.href : new URL(u.loc, site).href}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
