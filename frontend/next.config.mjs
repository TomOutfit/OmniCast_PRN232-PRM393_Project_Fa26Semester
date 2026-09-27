/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.omnicast.tv',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async rewrites() {
    const backendBase =
      process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
        : 'https://omnicast-api.vercel.app/api/v1';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
