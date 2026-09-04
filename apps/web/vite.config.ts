/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const apiTarget = process.env.IFMP_API_ORIGIN || 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Reuse root brand assets without copying.
  publicDir: path.resolve(__dirname, '../../public'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      // Reuse the existing Express API (npm run start in repo root).
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/live-gw': {
        target: 'http://127.0.0.1:1984',
        changeOrigin: true,
        ws: true,
        rewrite: (p) => p.replace(/^\/live-gw(?:\/site-[^/]+)?/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
