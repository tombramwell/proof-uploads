/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tells Next.js not to bundle these massive files
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;