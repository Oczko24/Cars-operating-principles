import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8000,
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        sandbox: 'sandbox.html'
      }
    }
  }
});

