import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint key removed to avoid Next.js 15+ warnings
};

export default nextConfig;
