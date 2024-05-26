import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      includeAssets: ["/training.dat", "/kalam.woff2"],
      manifest: {
        name: "Truffle",
        short_name: "truffle",
        description: "A dice rolling game",
        display: "fullscreen",
        orientation: "portrait",
        theme_color: "#6D28D9",
        background_color: "#6D28D9",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshot1.png",
            sizes: "440x720",
            type: "image/png",
            form_factor: "narrow",
            label: "Splash Screen",
          },
          {
            src: "/screenshot2.png",
            sizes: "440x720",
            type: "image/png",
            form_factor: "narrow",
            label: "Scoreboard",
          },
        ],
      },
    }),
  ],
});
