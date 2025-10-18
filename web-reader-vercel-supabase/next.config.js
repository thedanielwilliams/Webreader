/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = isDev ? "script-src 'self' 'unsafe-eval'" : "script-src 'self'";
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: blob: https://*.supabase.co",
      scriptSrc,
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join('; ');
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'display-capture=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;