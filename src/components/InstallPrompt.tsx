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
import { StitchedCard } from "./card";
import { DialogTitle } from "./DialogTitle";

export function InstallPrompt() {
  if (!installPromptOpen.value || !canInstall.value) return null;

  const t = i18n.value;

  return (
    <Overlay onClose={dismissInstallPrompt}>
      <StitchedCard
        pop
        class="flex w-full max-w-sm flex-col gap-4 p-5"
        onClick={(e: Event) => e.stopPropagation()}
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <DialogTitle class="leading-none">{t.installTitle}</DialogTitle>
            <p class="mt-2 text-body leading-snug text-neutral-600">
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
          <Button
            intent="secondary"
            class="flex-1"
            onClick={dismissInstallPrompt}
          >
            {t.notNow}
          </Button>
        </div>
      </StitchedCard>
    </Overlay>
  );
}
