/**
 * Promo screencast generator.
 *
 * Spins up the Vite dev server and records a short *video* of the app in its
 * `?demo=roll` motion scene (see src/demo.ts), which starts a real game and
 * auto-throws once so the live 3D physics dice tumble is captured — never the
 * frozen stageDemo layout the still screenshots use.
 *
 * Playwright records webm; we transcode to a portrait H.264 mp4 with ffmpeg so
 * it plays natively everywhere (Mastodon/Bluesky/LinkedIn/Instagram). Output
 * lands alongside the stills in public/screenshots/ — served at
 * truffle.gnass.buzz/screenshots/ and, like the screenshots, kept out of the
 * PWA precache by the screenshots entry in workbox.globIgnores (vite.config.ts).
 *
 * Usage:  node scripts/screencast.mjs [--scene=roll] [--seconds=5]
 */
import { spawn } from "node:child_process";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "public", "screenshots");
const rawDir = resolve(root, ".screencast-raw");

// iPhone-class portrait viewport rendered @2x → 780 × 1688 device pixels, matching
// the still screenshots. The recorded video is captured at that native size.
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2;
const VIDEO_SIZE = { width: 780, height: 1688 };

const PORT = 5191;
const BASE = `http://127.0.0.1:${PORT}/`;
const READY_TIMEOUT_MS = 30_000;

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const args = parseArgs();
const SCENE = args.scene ?? "roll";
const SECONDS = Number(args.seconds ?? 5);

function startServer() {
  const child = spawn(
    "npx",
    ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
  );
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error("Vite did not start in time")), 30_000);
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (/Local:.*http/.test(String(chunk))) {
        clearTimeout(timer);
        res(child);
      }
    });
    child.on("exit", (code) => rej(new Error(`Vite exited early (code ${code})`)));
  });
}

/** Total duration (seconds) of a media file. */
function probeDuration(input) {
  return new Promise((res, rej) => {
    const ff = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      input,
    ]);
    let out = "";
    ff.stdout.on("data", (d) => (out += d));
    ff.on("exit", (code) =>
      code === 0 ? res(parseFloat(out.trim())) : rej(new Error(`ffprobe exited ${code}`)),
    );
  });
}

/**
 * Transcode the recorded webm to a portrait H.264 mp4 (silent, faststart),
 * dropping everything before `startSec` — that trims the blank app-load head so
 * only the throw remains.
 */
function transcode(input, output, startSec) {
  return new Promise((res, rej) => {
    const pre = startSec > 0 ? ["-ss", startSec.toFixed(2)] : [];
    const ff = spawn(
      "ffmpeg",
      [
        "-y",
        ...pre,
        "-i", input,
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        output,
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    ff.on("exit", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))));
  });
}

async function main() {
  await mkdir(rawDir, { recursive: true });

  console.log("Starting Vite…");
  const server = await startServer();

  // Real Chrome (channel: "chrome") gets hardware WebGL, so the three.js/cannon-es
  // physics renders smoothly; fall back to bundled Chromium if Chrome is absent.
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome" });
    console.log("Using system Chrome (hardware WebGL).");
  } catch {
    browser = await chromium.launch();
    console.log("System Chrome not found — using bundled Chromium (software WebGL).");
  }

  let webmPath;
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      isMobile: true,
      hasTouch: true,
      recordVideo: { dir: rawDir, size: VIDEO_SIZE },
    });
    const page = await context.newPage();
    const url = `${BASE}?demo=${SCENE}`;
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page
      .waitForFunction(() => window.__truffleDemoReady === true, null, {
        timeout: READY_TIMEOUT_MS,
      })
      .catch(() => console.warn("Ready flag not seen — recording anyway."));
    // Let the board paint and settle, then fire the throw on camera.
    await page.waitForTimeout(700);
    console.log(`Recording ${SECONDS}s of the throw…`);
    await page.evaluate(() => {
      const w = window;
      if (typeof w.__truffleRoll === "function") w.__truffleRoll();
    });
    await page.waitForTimeout(SECONDS * 1000);
    webmPath = await page.video().path();
    await context.close(); // finalizes the webm
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }

  // context.close() names the file after the page's guid; grab the newest webm.
  if (!webmPath) {
    const files = (await readdir(rawDir)).filter((f) => f.endsWith(".webm"));
    webmPath = resolve(rawDir, files.sort().at(-1));
  }

  const mp4 = resolve(outDir, `${SCENE}.mp4`);
  // Keep only the tail: the throw + settle sit in the last (SECONDS + preRoll)
  // of the recording; everything before is the blank load. Add a ~0.4s beat.
  const dur = await probeDuration(webmPath);
  const startSec = Math.max(0, dur - (SECONDS + 0.4));
  console.log(`Transcoding → ${mp4} (trim head ${startSec.toFixed(2)}s of ${dur.toFixed(2)}s)`);
  await transcode(webmPath, mp4, startSec);
  await rm(rawDir, { recursive: true, force: true });
  console.log(`Saved ${mp4} (${VIDEO_SIZE.width} × ${VIDEO_SIZE.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
