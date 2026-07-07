import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Ensure that source maps are disabled or handled correctly for production
  productionBrowserSourceMaps: false,
};

export default nextConfig;
