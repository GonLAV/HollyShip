import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const api = env.VITE_API_BASE_URL || 'http://localhost:8080'
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      globals: true,
    },
    server: {
      proxy: {
        '/health': { target: api, changeOrigin: true },
        '/v1': { target: api, changeOrigin: true },
      },
    },
    preview: {
      proxy: {
        '/health': { target: api, changeOrigin: true },
        '/v1': { target: api, changeOrigin: true },
      },
    },
  }
})
