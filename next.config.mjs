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
};

export default nextConfig;        

//destination: 'https://pub-36cd0e2bd1ea4e4a9c02a734ebf3afdf.r2.dev/:path*', 