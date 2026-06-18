import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In dev: served at "/" with a proxy to the API.
// In build: served by the BA Agent API under "/manager" (same origin, no CORS).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/manager/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // The UI talks ONLY to the local BA Agent API. Proxy avoids any CORS setup.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}));
