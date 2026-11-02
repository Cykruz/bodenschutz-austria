import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const DISALLOW = ['/admin', '/admin/', '/api/', '/anfrage/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      // KI-Crawler ausdrücklich erlaubt (siehe auch /llms.txt)
      { userAgent: 'GPTBot', allow: '/', disallow: DISALLOW },
      { userAgent: 'ClaudeBot', allow: '/', disallow: DISALLOW },
      { userAgent: 'anthropic-ai', allow: '/', disallow: DISALLOW },
      { userAgent: 'PerplexityBot', allow: '/', disallow: DISALLOW },
      { userAgent: 'Google-Extended', allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
