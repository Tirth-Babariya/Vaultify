/** @type {import('next').NextConfig} */
const nextConfig = {
  // The e2e runner builds into its own folder so it never clobbers the normal build.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
