import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
      '/v1': process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
    },
  },
});
