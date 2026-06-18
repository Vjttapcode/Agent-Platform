import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // The UI talks ONLY to the local BA Agent API. Proxy avoids any CORS setup.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
