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
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'www.thesportsdb.com',
      },
      {
        protocol: 'https',
        hostname: 'images.metmuseum.org',
      },
      {
        protocol: 'https',
        hostname: 'is1-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'test-videos.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'test-streams.mux.dev',
      },
      {
        protocol: 'https',
        hostname: 'commondatastorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'demo-res.cloudinary.com',
      },
    ],
  },
  async rewrites() {
    // Where the Next.js server proxies RELATIVE `/api/v1/*` requests.
    //
    // On a LAN / local setup the browser talks to the backend on the
    // SAME machine, so this proxy must point at the LOCAL backend
    // too. Pointing it at the deployed API instead would make server
    // -side reads hit the production database while the browser
    // reads the local one - the classic "the list is empty on the
    // laptop but full in production" symptom.
    //
    // `localhost` is correct here because this proxy runs ON the
    // machine that also hosts the backend.
    const configured = process.env.NEXT_PUBLIC_API_URL;
    const isLocalConfig = !configured || /localhost|127\.0\.0\.1/.test(configured);

    let backendBase;
    if (!isLocalConfig) {
      backendBase = configured.replace(/\/$/, '');
    } else if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      // A production build with no usable NEXT_PUBLIC_API_URL: the
      // deployed API is the only reachable backend.
      backendBase = 'https://omnicast-api.vercel.app/api/v1';
    } else {
      backendBase = 'http://localhost:3000/api/v1';
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
