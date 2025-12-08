import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useLightningcss: false,
    optimizePackageImports: [],
  },
  output: "standalone",
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  staticPageGenerationTimeout: 0,
  generateEtags: false,

  // Performance optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false, // Disable strict mode in production for faster rendering

  // Image configuration for YouTube thumbnails
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/**",
      },
    ],
    // Image optimization settings
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 604800, // Cache images for 7 days
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for caching
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },

  // Exclude problematic routes from static generation
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },

  // Webpack configuration for Electron
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  

};

export default nextConfig;
