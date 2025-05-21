import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if ('IPv4' === iface.family && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0';
}

const localIp = getLocalIpAddress();
console.log(`Using local IP address: ${localIp}`);

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_SERVER_HOST': JSON.stringify(localIp)
    },
    plugins: [react()],
    envPrefix: 'VITE_',
    server: {
      port: 80,
      host: localIp,
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
