import { computed, effect, signal } from "@preact/signals";
import { scoringRevealed } from "./state";

const AUTO_PROMPT_KEY = "truffle.installPromptShown.v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
export const installPromptOpen = signal(false);
export const appInstalled = signal(isInstalled());
export const canInstall = computed(
  () => deferredPrompt.value !== null && !appInstalled.value,
);

function isInstalled() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt.value = event as BeforeInstallPromptEvent;
});

window.addEventListener("appinstalled", () => {
  appInstalled.value = true;
  deferredPrompt.value = null;
  installPromptOpen.value = false;
});

matchMedia("(display-mode: standalone)").addEventListener("change", () => {
  appInstalled.value = isInstalled();
});

effect(() => {
  // Wait for the end-game scoring ceremony to finish playing out, so the prompt
  // lands on the settled leaderboard/stats rather than over the running tally.
  if (!scoringRevealed.value || !canInstall.value) return;
  if (localStorage.getItem(AUTO_PROMPT_KEY) === "1") return;

  localStorage.setItem(AUTO_PROMPT_KEY, "1");
  installPromptOpen.value = true;
});

export function dismissInstallPrompt() {
  installPromptOpen.value = false;
}

export async function promptInstall() {
  const event = deferredPrompt.value;
  if (!event || appInstalled.value) return;

  installPromptOpen.value = false;
  await event.prompt();
  const choice = await event.userChoice.catch(() => null);
  if (choice?.outcome === "accepted") appInstalled.value = true;
  deferredPrompt.value = null;
}
