import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MARSAM_NEXT_DIST_DIR || '.next',
  output: "standalone",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
