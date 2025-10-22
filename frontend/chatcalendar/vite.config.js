import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const root = fileURLToPath(new URL('./', import.meta.url))
const outDir = fileURLToPath(new URL('./dist', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root,
  base: '/chatcalendar/',
  plugins: [react()],
  server: {
    proxy:{
      '/getchat': 'http://localhost:8000',
      '/savechat': 'http://localhost:8000',
    }
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['@emoji-mart/react', '@emoji-mart/data']
  }
})
