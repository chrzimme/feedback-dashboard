import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  ...(isStaticExport && {
    output: "export",
    trailingSlash: true,
    basePath: "/feedback-dashboard",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
