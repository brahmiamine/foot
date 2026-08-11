import type { NextConfig } from 'next'
import path from 'path'

const OPTIONAL_DB_PACKAGES = [
  '@sap/hana-client',
  '@sap/hana-client/extension/Stream',
  'hdb-pool',
  'oracledb',
  'pg-native',
  'pg-query-stream',
  'react-native-sqlite-storage',
  'sql.js',
  'sqlite3',
  'better-sqlite3',
  'typeorm/connection/ConnectionOptionsReader',
  'typeorm/util/DirectoryExportedClassesLoader',
]

const TYPEORM_WARNING_REGEX = /typeorm\/(connection\/ConnectionOptionsReader|util\/DirectoryExportedClassesLoader)/

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Augmenter la limite de taille pour les uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.flashscore.com',
      },
      {
        protocol: 'https',
        hostname: 'ssl.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: '*.wikipedia.org',
      },
      {
        protocol: 'https',
        hostname: 'img.uefa.com',
      },
      {
        protocol: 'https',
        hostname: '*.fifa.com',
      },
      {
        protocol: 'https',
        hostname: 'crests.football-data.org',
      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
      },
      {
        protocol: 'https',
        hostname: 'media-*.api-sports.io',
      },
    ],
  },
  // Rewrites pour rediriger les anciennes URLs d'uploads vers les routes API
  async rewrites() {
    return [
      {
        source: '/uploads/federations/:filename',
        destination: '/api/uploads/federation/:filename',
      },
      {
        source: '/uploads/leagues/:filename',
        destination: '/api/uploads/league/:filename',
      },
      {
        source: '/uploads/arbitres/:filename',
        destination: '/api/uploads/arbitre/:filename',
      },
    ]
  },
  webpack(config, { isServer }) {
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}

    // TypeORM occasionally tries to resolve the legacy "mysql" module.
    config.resolve.alias.mysql = config.resolve.alias.mysql ?? require.resolve('mysql2')

    OPTIONAL_DB_PACKAGES.forEach((pkg) => {
      config.resolve!.alias![pkg] = false
    })

    config.module = config.module || {}
    config.module.exprContextCritical = false

    if (!isServer) {
      // require() volontaire : webpack n'est utile qu'ici (build client),
      // pas dispo en top-level import sans risquer de le charger aussi côté
      // Edge/serveur.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpack = require('webpack')
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource: string) {
            return (
              OPTIONAL_DB_PACKAGES.includes(resource) ||
              TYPEORM_WARNING_REGEX.test(resource ?? '')
            )
          },
        })
      )
    }

    config.ignoreWarnings = config.ignoreWarnings || []
    config.ignoreWarnings.push({
      module: /typeorm/,
      message: /Critical dependency: the request of a dependency is an expression/,
    })

    return config
  },
}

export default nextConfig
