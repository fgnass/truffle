import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createAppleSplashScreens } from "@vite-pwa/assets-generator/config";
import { generateAssets } from "@vite-pwa/assets-generator/api/generate-assets";
import { instructions } from "@vite-pwa/assets-generator/api/instructions";

const background = "#8362E5";
const splashImageName = "splash.svg";

const emptyAsset = {
  sizes: [],
  favicons: [],
};

const splashPreset = {
  transparent: emptyAsset,
  maskable: emptyAsset,
  apple: emptyAsset,
  appleSplashScreens: createAppleSplashScreens({
    padding: 0,
    resizeOptions: { background, fit: "contain" },
    darkResizeOptions: { background, fit: "contain" },
    linkMediaOptions: {
      log: true,
      addMediaScreen: true,
      xhtml: false,
    },
  }),
};

export async function createSplashInstructions({ base = "/", publicDir }) {
  const imageFile = resolve(publicDir, splashImageName);

  return instructions({
    imageResolver: () => readFile(imageFile),
    imageName: splashImageName,
    originalName: splashImageName,
    preset: splashPreset,
    faviconPreset: "2023",
    htmlLinks: {
      xhtml: false,
      includeId: false,
    },
    basePath: base,
    resolveSvgName: (name) => name,
  });
}

export function splashHeadLinks(splashInstructions) {
  return Object.values(splashInstructions.appleSplashScreen)
    .map((asset) => asset.link)
    .filter(Boolean);
}

export function truffleSplashScreens() {
  let viteConfig;
  let splashInstructionsPromise;

  const load = () => {
    splashInstructionsPromise ??= createSplashInstructions({
      base: viteConfig.base,
      publicDir: resolve(viteConfig.root, viteConfig.publicDir),
    });

    return splashInstructionsPromise;
  };

  return {
    name: "truffle-splash-screens",
    configResolved(config) {
      viteConfig = config;
    },
    async transformIndexHtml(html) {
      const links = splashHeadLinks(await load());

      return html.replace("</head>", `${links.join("\n")}\n</head>`);
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url
          ? new URL(request.url, "http://localhost").pathname
          : "";
        const splashInstructions = await load();
        const asset = splashInstructions.appleSplashScreen[pathname];

        if (!asset) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", asset.mimeType);
        response.end(await asset.buffer());
      });
    },
    async writeBundle() {
      await generateAssets(
        await load(),
        true,
        resolve(viteConfig.root, viteConfig.build.outDir),
      );
    },
    handleHotUpdate({ file }) {
      if (file === resolve(viteConfig.root, viteConfig.publicDir, splashImageName)) {
        splashInstructionsPromise = undefined;
      }
    },
  };
}

export async function generateSplashScreens({ publicDir }) {
  await generateAssets(
    await createSplashInstructions({ publicDir }),
    true,
    publicDir,
  );
}
