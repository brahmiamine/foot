import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages externes pour les composants serveur (TypeORM a besoin du runtime Node).
  serverExternalPackages: ["typeorm", "reflect-metadata"],
  // webpack plutôt que turbopack : meilleure compatibilité avec les décorateurs TypeORM.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "typeorm", "reflect-metadata"];
    }
    return config;
  },
};

export default nextConfig;
