import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ask before switching to a new version, so an update never reloads the page
      // while someone has unsaved input in a tool.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'favicon-48x48.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'NexTools',
        short_name: 'NexTools',
        description: 'Developer tools that run in your browser: format, convert, generate, encode, compare and test. Works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#F6F6F3',
        background_color: '#F6F6F3',
        categories: ['developer', 'productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app, including lazy routes (YAML) and the hash and regex
        // workers, so every tool works offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Client-side routes such as /jwt?mode=encode fall back to the app shell.
        navigateFallback: '/index.html',
        // Vercel's analytics endpoints must reach the network, never the app shell.
        navigateFallbackDenylist: [/^\/_vercel\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
