import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // base changed from './' to '/' to enable React Router browser routing (HTML5 history API).
    // Capacitor native builds (iOS/Android) require base: './' — restore if building for native.
    // Web (Vercel) works with '/' because vercel.json rewrites all paths to index.html.
    base: '/',
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
