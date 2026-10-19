import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a plain static copy into out/ (preview hosting, see scripts/export-preview.mjs)
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // lets a production build live next to the running dev server (NEXT_DIST_DIR=.next-prod)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  ...(staticExport ? { output: "export" as const } : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    // no image server on static hosting
    unoptimized: staticExport,
  },
};

export default nextConfig;
