import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

// Bundle the app version (from package.json) into the build so the
// "Check for Updates" feature can compare the running build against the
// latest GitHub release. Exposed as the global constant __APP_VERSION__.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))

// MilCalc builds to a single self-contained MilCalc.html that users download
// and open from disk (file://). Everything — JS, CSS, fonts (base64) — is
// inlined into one HTML file by vite-plugin-singlefile. The post-build step
// (scripts/rename-build.js, run via `npm run build`) renames the output to
// dist/MilCalc.html.
//
// base is './' so all references are relative and the file works from file://.
// Capacitor native builds (iOS/Android) also want './', so this is compatible.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
