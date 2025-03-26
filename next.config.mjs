/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.youtube.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '160mb' // CANNOT ACCESS CONSTANTS IN LIB FROM NEXT.CONFIG.MJS
    }
  }
};

export default nextConfig;
