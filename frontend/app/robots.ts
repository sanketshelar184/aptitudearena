import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aptitudearena.com';
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/tests',
        '/tests/free',
        '/pricing',
        '/login',
        '/register',
      ],
      disallow: [
        '/admin',
        '/admin/*',
        '/dashboard',
        '/dashboard/*',
        '/attempt/*',
        '/result/*',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

