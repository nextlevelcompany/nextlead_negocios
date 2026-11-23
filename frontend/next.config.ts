import type { NextConfig } from "next";

const backendInternalUrl = process.env.BACKEND_INTERNAL_URL || (process.env.NODE_ENV === "production" ? "http://backend:8080" : "http://localhost:8081");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendInternalUrl}/uploads/:path*`,
      },
      {
        source: "/oportunidades/:path*",
        destination: "/opportunities/:path*",
      },
    ];
  },
};

export default nextConfig;
