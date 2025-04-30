/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5225",
        pathname: "/uploads/**",
      },
    ],
    domains: ["localhost"],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:5225/uploads/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
