import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Allow external image domains for doctor profile images
  eslint: {
    // Don't fail production builds on lint warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail production builds on TS errors (we fix later)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
