import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // External packages for server components (moved from experimental in Next.js 16)
  serverExternalPackages: ["typeorm", "reflect-metadata"],
  // Use webpack instead of turbopack for better TypeORM compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Fix for TypeORM and reflect-metadata
      config.externals = [...(config.externals || []), "typeorm", "reflect-metadata"];
    }
    return config;
  },
  // Add headers to preload critical CSS
  async headers() {
    return [
      {
        source: "/css/bootstrap.min.css",
        headers: [
          {
            key: "Link",
            value: "</css/bootstrap.min.css>; rel=preload; as=style",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
