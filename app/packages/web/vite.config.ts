import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: './',
  server: {
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4176,
  },
  optimizeDeps: {
    entries: ['./index.html'],
  },
});