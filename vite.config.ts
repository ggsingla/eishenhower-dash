import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dependency groups that change on different schedules, so a release that only
// touches app code doesn't invalidate the framework bundle in anyone's cache.
const VENDOR_GROUPS = [
  { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
  { name: 'dnd', test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/ },
  // Radix is deliberately NOT grouped: a single radix chunk would drag the
  // dialog primitives onto the critical path and undo the lazy overlays.
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: VENDOR_GROUPS },
      },
    },
  },
})
