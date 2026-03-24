import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Static export mode: used for Git Pages deployment
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        basePath: "/feedback-dashboard",
        images: { unoptimized: true },
      }
    : {
        // Local dev / server mode
        serverExternalPackages: ["better-sqlite3"],
      }),
};

export default nextConfig;
