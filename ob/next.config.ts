import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit charge ses métriques de polices standard (.afm) depuis le disque
  // via des chemins relatifs à son propre module — le bundling webpack les
  // casse (fichiers non copiés, chemins réécrits). External côté serveur
  // pour qu'il continue à résoudre ces fichiers normalement depuis node_modules.
  serverExternalPackages: ["typeorm", "reflect-metadata", "pdfkit"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "typeorm", "reflect-metadata", "pdfkit"];
    }
    return config;
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }, { protocol: "http", hostname: "**" }],
  },
};

export default nextConfig;
