import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/react-calendar/',
  plugins: [react()],
  server: {
    proxy:{
      '/getchat': 'http://localhost:8000',
      '/savechat': 'http://localhost:8000',

    }
  }
})
