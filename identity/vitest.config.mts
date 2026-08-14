import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // src/i18n/i18n.test.ts est un test node:test préexistant (test()
    // importé de "node:test", pas de vitest) — hors périmètre de ce
    // changement (TS-34), laissé à son propre runtime.
    exclude: ['src/i18n/**', 'node_modules/**'],
    setupFiles: ['src/test/setupSqliteTypes.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
