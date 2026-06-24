import { Download, X } from "lucide-preact";
import {
  canInstall,
  dismissInstallPrompt,
  installPromptOpen,
  promptInstall,
} from "../installPrompt";
import { i18n } from "../state";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Overlay } from "./Overlay";
import { stitchedCard } from "./card";

export function InstallPrompt() {
  if (!installPromptOpen.value || !canInstall.value) return null;

  const t = i18n.value;

  return (
    <Overlay onClose={dismissInstallPrompt}>
      <div
        class={`w-full max-w-sm p-5 text-ink flex flex-col gap-4 animate-popIn ${stitchedCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-logo text-2xl leading-none text-ink">
              {t.installTitle}
            </h2>
            <p class="mt-2 text-[0.95rem] leading-snug text-neutral-600">
              {t.installBody}
            </p>
          </div>
          <IconButton
            onClick={dismissInstallPrompt}
            aria-label={t.close}
            class="shrink-0"
          >
            <X class="size-5" />
          </IconButton>
        </div>

        <div class="flex gap-2">
          <Button class="flex-1" onClick={promptInstall}>
            <Download class="size-4" />
            {t.installAction}
          </Button>
          <Button intent="secondary" class="flex-1" onClick={dismissInstallPrompt}>
            {t.notNow}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
