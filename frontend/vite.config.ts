import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5179,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/hermes': {
        target: 'http://localhost:8642',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hermes/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove Origin/Referer so hermes CORS check doesn't block us
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
      '/hermes-dash': {
        target: 'http://localhost:9119',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hermes-dash/, ''),
      }
    }
  }
})
