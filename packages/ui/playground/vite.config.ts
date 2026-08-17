import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone Vite app used only to browse @foot/ui components locally.
// It imports components straight from `../src` (no build step, no
// dependency on @foot/ui as a package) and is deliberately excluded from
// pnpm-workspace.yaml so it never becomes part of the monorepo's package
// graph or gets pulled into any consumer app.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // `../src` imports live outside this project root (by design — the
    // playground renders @foot/ui's source directly without a package
    // dependency). Without `dedupe`, Vite can resolve "react"/"react-dom"
    // differently for those files vs. this app's own files, since each
    // directory has its own `node_modules`, producing two React copies
    // and "invalid hook call" errors. Dedupe forces a single instance.
    dedupe: ['react', 'react-dom', 'styled-components'],
  },
  server: {
    port: 4173,
  },
})
