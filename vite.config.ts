import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Changez en '/folix/' ou votre sous-répertoire si applicable

  server: {
    proxy: {
      '/api': {
        target: 'http://178.104.248.78',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[proxy error]', err.message);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              console.error('[proxy ws socket error]', err.message);
            });
          });
        },
      },
      '/uploads': {
        target: 'http://178.104.248.78',
        changeOrigin: true,
        secure: false,
      },
      '/r2': {
        target: 'https://pub-6359d54251d74e879f64e6dc3afdb145.r2.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/r2/, ''),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          });
        },
      },
    },
  },
})
