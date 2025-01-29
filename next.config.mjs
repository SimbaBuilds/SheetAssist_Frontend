/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.youtube.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    }
  }
};

export default nextConfig;
