import path from 'path';
import { fileURLToPath } from 'url';

// Works on every Node version (import.meta.dirname needs Node 20.11+).
const projectDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js is picking a stray lockfile in the home directory as the workspace
  // root. Pin it to this project so the multiple-lockfiles warning goes away.
  outputFileTracingRoot: projectDir,
  images: {
    remotePatterns: [
      // Allow previews of files served by the Express API during development.
      { protocol: 'http', hostname: 'localhost', port: '5001', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;