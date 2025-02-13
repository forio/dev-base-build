import react from '@vitejs/plugin-react-swc';
import path from 'path';
import i18nextLoader from 'vite-plugin-i18next-loader';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: 'localhost',
    port: 8888,
  },
  base: './',
  build: {
    outDir: 'public',
  },
  plugins: [
    react(),
    tsconfigPaths(),
    i18nextLoader({
      paths: ['src/assets/lang'],
      namespaceResolution: 'relativePath',
    }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
});
