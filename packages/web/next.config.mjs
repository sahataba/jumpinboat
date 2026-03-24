/** @type {import("next").NextConfig} */
// Upstream Effect API for /api/* rewrites (not the Vercel URL). Same as API_BASE_URL in README.
const apiUpstreamOrigin = (process.env.API_BASE_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUpstreamOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
