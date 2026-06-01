/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/Test/promoter",
  assetPrefix: "/Test/promoter",
  trailingSlash: true,
  images: { unoptimized: true },
};
module.exports = nextConfig;
