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
      },
      '/uploads': {
        target: 'http://178.104.248.78',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
