import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      'bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        api: 'modern-compiler',
        loadPaths: [path.resolve(__dirname, 'node_modules')],
        silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
      },
    },
  },
})
