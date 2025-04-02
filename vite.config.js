import { defineConfig } from 'vite';

export default defineConfig({
  base: '/vibe/',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    assetsInclude: ['**/*.jpg', '**/*.png', '**/*.glb', '**/*.gltf', '**/*.bin', '**/*.mp3', '**/*.wav'],
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  publicDir: 'public',
}); 