/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.youtube.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '40mb'
    }
  }
};

export default nextConfig;
