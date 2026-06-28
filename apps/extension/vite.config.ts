import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: './manifest.json',
      watchFilePaths: ['manifest.json'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Point Vite directly at TS source — avoids CJS __exportStar rollup issues
      '@planning-poker/shared-types': resolve(
        __dirname,
        '../../packages/shared-types/src/index.ts'
      ),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
  },
});
