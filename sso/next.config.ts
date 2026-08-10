import type { NextConfig } from "next";
import path from "path";

const OPTIONAL_DB_PACKAGES = [
  "@sap/hana-client",
  "@sap/hana-client/extension/Stream",
  "hdb-pool",
  "oracledb",
  "pg-native",
  "pg-query-stream",
  "react-native-sqlite-storage",
  "sql.js",
  "sqlite3",
  "better-sqlite3",
  "typeorm/connection/ConnectionOptionsReader",
  "typeorm/util/DirectoryExportedClassesLoader",
];

const TYPEORM_WARNING_REGEX = /typeorm\/(connection\/ConnectionOptionsReader|util\/DirectoryExportedClassesLoader)/;

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["typeorm", "reflect-metadata"],
  webpack(config, { isServer }) {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.mysql = config.resolve.alias.mysql ?? require.resolve("mysql2");

    OPTIONAL_DB_PACKAGES.forEach((pkg) => {
      config.resolve!.alias![pkg] = false;
    });

    config.module = config.module || {};
    config.module.exprContextCritical = false;

    if (isServer) {
      config.externals = [...(config.externals || []), "typeorm", "reflect-metadata"];
    } else {
      const webpack = require("webpack");
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource: string) {
            return OPTIONAL_DB_PACKAGES.includes(resource) || TYPEORM_WARNING_REGEX.test(resource ?? "");
          },
        })
      );
    }

    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push({
      module: /typeorm/,
      message: /Critical dependency: the request of a dependency is an expression/,
    });

    return config;
  },
};

export default nextConfig;
