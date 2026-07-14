import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/env';

// Rendered per request rather than baked at build time: APP_URL is runtime
// configuration and the Docker image is built without an .env.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const base = getEnv().APP_URL;
  return {
    rules: {
      userAgent: '*',
      // The instance itself is private and stays out of search results. The user
      // guide is the one page meant to be findable, so it is the only allowance.
      // Longest-match wins, so `/docs` beats the `/` disallow for crawlers that
      // honour Allow (Google, Bing); ones that do not simply index nothing.
      allow: '/docs',
      disallow: '/',
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
