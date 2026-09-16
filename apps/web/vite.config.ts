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
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
    // `vite preview` serves the production build, and it is what the Cloudflare
    // tunnel points at for the demo. It needs the same host-header tolerance as
    // the dev server: the tunnel forwards the public hostname rather than
    // localhost, and Vite rejects unknown hosts by default. Without this the
    // tunnel returns "Blocked request. This host is not allowed."
    allowedHosts: true,
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
