import { defineConfig, type Preset } from "@vite-pwa/assets-generator/config";

const background = "#8362E5";

const iconPreset: Preset = {
  transparent: {
    sizes: [64, 192, 512],
    favicons: [[48, "favicon.ico"]],
    padding: 0,
  },
  maskable: {
    sizes: [512],
    padding: 0.1,
    resizeOptions: { background },
  },
  apple: {
    sizes: [180],
    padding: 0,
    resizeOptions: { background },
  },
};

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  images: ["public/app-icon-clipped.svg"],
  preset: iconPreset,
});
