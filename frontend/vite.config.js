import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/app/',
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('cropperjs')) return 'cropper';
            if (id.includes('jsbarcode')) return 'jsbarcode';
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'vendor-vue';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
