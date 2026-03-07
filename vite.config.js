import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Capacitor needs relative paths
    base: './',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep chunk sizes reasonable for mobile WebView
        manualChunks: undefined,
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
