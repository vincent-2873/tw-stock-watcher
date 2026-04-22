/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // 本機開發時,把 /api/backend/* 代理到 FastAPI
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
