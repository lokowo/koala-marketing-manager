import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Koala PhD 考拉博士',
    short_name: 'Koala PhD',
    description: '澳洲PhD申请AI智能顾问平台',
    start_url: '/koala/home',
    display: 'standalone',
    background_color: '#080c10',
    theme_color: '#D4A843',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
