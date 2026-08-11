import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "reflect-metadata"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "typeorm", "reflect-metadata"];
    }
    return config;
  },
};

export default nextConfig;
