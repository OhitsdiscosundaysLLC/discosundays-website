import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: false,
  experimental: { globalNotFound: true },
  outputFileTracingIncludes: { '/**': ['./content/**/*'] },
  async redirects() {
    return [
      // Redirects that exist on the live Shopify store
      { source: '/pages/record-label', destination: '/pages/team', permanent: true },
      { source: '/es/pages/record-label', destination: '/es/pages/team', permanent: true },
      { source: '/collections/:c/products/:handle', destination: '/products/:handle', permanent: true },
      { source: '/es/collections/:c/products/:handle', destination: '/es/products/:handle', permanent: true },
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*', permanent: true },
      // Shopify customer-account and checkout routes are served by Shopify itself
      { source: '/account/:path*', destination: `https://${process.env.NEXT_PUBLIC_SHOPIFY_CHECKOUT_DOMAIN || 'disco-sundays.myshopify.com'}/account/:path*`, permanent: false },
      { source: '/checkout', destination: '/cart', permanent: false },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/blogs/news', has: [{ type: 'query', key: 'page', value: '(?<n>\\d+)' }], destination: '/blogs/news/__page-:n' },
        { source: '/es/blogs/news', has: [{ type: 'query', key: 'page', value: '(?<n>\\d+)' }], destination: '/es/blogs/news/__page-:n' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      { source: '/shop/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/theme/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
    ];
  },
};

export default nextConfig;
