import type { NextConfig } from "next";

const optionalDbPackages = [
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

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config.resolve.alias.mysql = config.resolve.alias.mysql ?? require.resolve("mysql2");
    optionalDbPackages.forEach((pkg) => {
      config.resolve.alias[pkg] = false;
    });
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push({
      module: /typeorm/,
      message: /Critical dependency: the request of a dependency is an expression/,
    });
    return config;
  },
};

export default nextConfig;
