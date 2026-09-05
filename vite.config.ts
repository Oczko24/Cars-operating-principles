import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 8000,
    host: true,
  },
  plugins: [
    react(),
    {
      name: 'clean-urls',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && !req.url.includes('.') && req.url !== '/' && !req.url.startsWith('/@')) {
            req.url = req.url + '.html';
          }
          next();
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        sandbox: 'sandbox.html',
        privacy: 'privacy.html',
        legal: 'legal.html',
        notFound: '404.html'
      }
    }
  }
});
