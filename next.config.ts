import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  // An toàn khi Turbopack infer root sai
  experimental: {
    // tsconfig path mapping fallback
    esmExternals: true,
  },
};

export default nextConfig;
