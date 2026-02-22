import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  base: '/particles/',
  server: {
    cors: true,
    strictPort: true,
    hmr: {
      port: 5173,
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:9800',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    TanStackRouterVite(),
    react(),
    {
      name: 'base-path-redirect',
      configureServer(server) {
        // Redirect /particles (no trailing slash) to /particles/ so the SPA loads
        server.middlewares.use((req, _res, next) => {
          if (req.url && /^\/particles(\?.*)?$/.test(req.url)) {
            req.url = req.url.replace('/particles', '/particles/')
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'three'],
  },
})
