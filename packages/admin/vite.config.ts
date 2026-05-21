/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

// Copies the pdfjs worker as a .js file so servers always serve it with the
// correct MIME type (avoids the application/octet-stream issue with .mjs).
const copyPdfjsWorker = () => ({
  name: 'copy-pdfjs-worker',
  buildStart() {
    const candidates = [
      resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
      resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    ]
    const src = candidates.find(existsSync)
    if (!src) throw new Error('[copy-pdfjs-worker] pdf.worker.min.mjs not found')
    const dest = resolve(__dirname, 'public/pdf.worker.js')
    mkdirSync(resolve(__dirname, 'public'), { recursive: true })
    copyFileSync(src, dest)
  },
})

export default defineConfig({
  plugins: [react(), copyPdfjsWorker()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
