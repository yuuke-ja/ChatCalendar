import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const root = fileURLToPath(new URL('./', import.meta.url))
const outDir = fileURLToPath(new URL('./dist', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root,
  base: '/privatecalendar/',
  plugins: [react()],
  server: {
    proxy: {
      '/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['@emoji-mart/react', '@emoji-mart/data'],
  },
})
