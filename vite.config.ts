import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "logo-esc.png", "icon.ico"],
      manifest: {
        name: "Earhouse Chord Pad",
        short_name: "Chord Pad",
        description:
          "A pocket chord instrument for songwriters — pads, presets, and a metronome. Works offline.",
        start_url: "/pad",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#131317",
        theme_color: "#131317",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the built app shell (incl. the lazy /pad chunk) so Chord Pad
        // works fully offline. Fonts are cached at runtime instead of bloating
        // the precache.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        // Never let the SPA fallback swallow API requests.
        navigateFallbackDenylist: [/^\/api/],
        // IMPORTANT: no runtime caching rule for the API origin, so API
        // responses always go straight to the network (never cached).
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin, url }) =>
              sameOrigin && /\.(?:woff2?|ttf|otf)$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "esc-fonts",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
