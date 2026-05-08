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
    },
  },
})
