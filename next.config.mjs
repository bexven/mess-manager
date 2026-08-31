/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // This codebase was authored without a Node.js environment to run `next
    // lint` against, so builds aren't blocked on unverified lint findings.
    // Run `npm run lint` locally and flip this back to false once it's clean.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
