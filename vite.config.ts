import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_SERVER_HOST': JSON.stringify('window.location.hostname')
    },
    plugins: [react()],
    envPrefix: 'VITE_',
    server: {
      port: 80,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'ws://localhost:3000',
          ws: true,
        }
      }
    },
    optimizeDeps: {
      exclude: ['lucide-react', 'os'],
    },
  };
});
