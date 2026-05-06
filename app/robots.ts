import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/koala/my-profile', '/koala/matches'],
      },
    ],
    sitemap: 'https://koalaphd.com/sitemap.xml',
  };
}
