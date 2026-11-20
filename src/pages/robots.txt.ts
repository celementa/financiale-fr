import type { APIRoute } from 'astro';

// En préversion (PREVIEW=1), on bloque toute indexation pour ne pas concurrencer le futur site.
export const GET: APIRoute = ({ site }) =>
  new Response(
    import.meta.env.PREVIEW === '1'
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`,
  );
