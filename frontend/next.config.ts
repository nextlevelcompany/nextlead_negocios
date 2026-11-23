import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:8081/uploads/:path*",
      },
      {
        source: "/oportunidades/:path*",
        destination: "/opportunities/:path*",
      },
    ];
  },
};

export default nextConfig;
