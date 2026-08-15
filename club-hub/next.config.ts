import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep TypeORM and reflection server-only without custom webpack hooks.
  // This lets Next.js 16 use Turbopack for dev/build while Node resolves the
  // ORM packages at runtime.
  serverExternalPackages: ["typeorm", "reflect-metadata", "mysql2", "mariadb"],
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

export default nextConfig;
