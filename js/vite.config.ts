import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: 'demo',
  publicDir: false,
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
});
