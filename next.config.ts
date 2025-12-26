import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Configuration PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Optimisations pour PWA
  compress: true,
  poweredByHeader: false,
  // Configuration pour les assets statiques
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
