/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // MAGIC REGEX: Only intercept URLs that are letters/numbers/hyphens and end in .html
        source: '/:file([a-zA-Z0-9-]+\\.html)', 
        
        // PASTE YOUR REAL CLOUDFLARE URL BELOW
        destination: 'https://pub-36cd0e2bd1ea4e4a9c02a734ebf3afdf.r2.dev/:file', 
      },
    ];
  },
    async headers() {
    return [
      {
        source: '/:file([a-zA-Z0-9-]+\\.html)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: "default-src 'self' 'unsafe-inline' data: https:; script-src 'none';" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' }
        ],
      },
    ];
  },
};

export default nextConfig;        

//destination: 'https://pub-36cd0e2bd1ea4e4a9c02a734ebf3afdf.r2.dev/:path*', 