import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // if (!isServer) {
    //   config.devtool = 'eval-source-map'; // or 'inline-source-map'
    // }
    return config;
  }
};

export default nextConfig;
