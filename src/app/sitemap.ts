import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/env';

// Per request, for the same reason as robots.ts: APP_URL is runtime config.
export const dynamic = 'force-dynamic';

// Only the public user guide. Everything else needs an account and is
// disallowed in robots.ts, so listing it would be an invitation to crawl pages
// that answer with a redirect to /login.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getEnv().APP_URL;
  return [
    {
      url: `${base}/docs`,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: {
        languages: {
          ru: `${base}/docs`,
          en: `${base}/docs?lang=en`,
        },
      },
    },
  ];
}
