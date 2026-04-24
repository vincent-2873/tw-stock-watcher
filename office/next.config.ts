import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 不要追蹤 root /pnpm-lock.yaml — office 是獨立 monorepo service
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
