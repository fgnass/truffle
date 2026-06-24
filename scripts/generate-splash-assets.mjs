import { resolve } from "node:path";
import { generateSplashScreens } from "./pwa-splash-screens.mjs";

await generateSplashScreens({
  publicDir: resolve(process.cwd(), "public"),
});
