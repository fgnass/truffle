import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { truffleSplashScreens } from "./scripts/pwa-splash-screens.mjs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    preact(),
    truffleSplashScreens(),
    VitePWA({
      // Precached explicitly: Workbox's default globPatterns cover the built
      // JS/CSS/HTML but not these, and both are needed for offline play — the
      // strategy table and the truffle fanfare.
      includeAssets: ["/training.dat", "/truffle.mp3"],
      pwaAssets: {
        config: true,
      },
      workbox: {
        // The portfolio screenshots live in public/ only so the deployed site
        // serves them (the portfolio links the live URLs). They aren't part of
        // the app, so keep them out of the offline precache.
        globIgnores: ["**/screenshots/**"],
      },
      manifest: {
        name: "Truffle",
        short_name: "truffle",
        description: "A dice rolling game",
        display: "fullscreen",
        orientation: "portrait",
        theme_color: "#8362E5",
        background_color: "#8362E5",
      },
    }),
  ],
});
