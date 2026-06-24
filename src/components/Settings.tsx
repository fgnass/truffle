import { Download, HelpCircle, Smartphone, Trash2, X } from "lucide-preact";
import { useState } from "preact/hooks";
import {
  gameFinished,
  i18n,
  newGame,
  online,
  openIntro,
  openStats,
  piggyHints,
  players,
  settingsOpen,
  sound,
  started,
} from "../state";
import { clearGames } from "../stats";
import { distributeGame } from "../net";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Dialog } from "./Dialog";
import { ShareButton } from "./ShareButton";
import { ToggleRow } from "./ToggleRow";
import { canInstall, promptInstall } from "../installPrompt";

// The global settings sheet: the Piggy toggle, share, and — while a game is
// running — a way to abandon it (which wasn't possible before).
export function Settings() {
  // Two-step destructive action: the reset-stats link arms this, and only the
  // confirm dialog actually wipes the log.
  const [confirmReset, setConfirmReset] = useState(false);
  if (!settingsOpen.value) return null;
  const t = i18n.value;
  const close = () => (settingsOpen.value = false);
  return (
    <>
      <Dialog onClose={close} class="flex w-full max-w-sm flex-col gap-4 p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-logo text-2xl text-ink">{t.settingsTitle}</h2>
          <IconButton onClick={close} aria-label={t.close}>
            <X class="size-5" />
          </IconButton>
        </div>

        <ToggleRow
          label={t.piggyHints}
          labelClass="text-base font-medium"
          checked={piggyHints.value}
          onChange={(v) => (piggyHints.value = v)}
        />

        <ToggleRow
          label={t.soundEffects}
          labelClass="text-base font-medium"
          checked={sound.value}
          onChange={(v) => (sound.value = v)}
        />

        <Button
          intent="secondary"
          class="mt-1 w-full"
          onClick={() =>
            // Scope to the current roster during a game; all-time otherwise.
            openStats(
              started.value ? players.value.map((p) => p.name.value ?? "") : [],
            )
          }
        >
          {t.statsButton}
        </Button>

        <Button intent="secondary" class="w-full" onClick={openIntro}>
          <HelpCircle class="size-4" />
          {t.howToPlay}
        </Button>

        {canInstall.value && (
          <Button
            intent="secondary"
            class="w-full"
            onClick={() => {
              settingsOpen.value = false;
              promptInstall();
            }}
          >
            <Download class="size-4" />
            {t.installAction}
          </Button>
        )}

        {/* Split a running local pass-and-play game onto each player's device. */}
        {started.value &&
          !online.value &&
          !gameFinished.value &&
          players.value.length > 1 && (
            <Button
              intent="secondary"
              class="w-full"
              onClick={() => {
                settingsOpen.value = false;
                distributeGame();
              }}
            >
              <Smartphone class="size-4" />
              {t.splitToDevices}
            </Button>
          )}

        {started.value && (
          <Button intent="secondary" class="w-full" onClick={newGame}>
            {gameFinished.value ? t.newGame : t.cancelGame}
          </Button>
        )}

        <div class="flex justify-center pt-1">
          <ShareButton tone="light" />
        </div>

        <Button
          intent="ghost"
          onClick={() => setConfirmReset(true)}
          class="mt-1 gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"
        >
          <Trash2 class="size-4" />
          {t.resetStats}
        </Button>
      </Dialog>

      {confirmReset && (
        // Confirm step for the irreversible wipe. Sits above the settings sheet;
        // its own backdrop tap cancels rather than deletes.
        <Dialog
          onClose={() => setConfirmReset(false)}
          class="flex w-full max-w-xs flex-col gap-4 p-5"
        >
          <h2 class="font-logo text-2xl text-ink">{t.resetStats}</h2>
          <p class="text-body leading-snug text-neutral-600">
            {t.resetStatsBody}
          </p>
          <div class="flex gap-2">
            <Button
              intent="danger"
              class="flex-1"
              onClick={() => {
                clearGames();
                setConfirmReset(false);
              }}
            >
              {t.resetStatsConfirm}
            </Button>
            <Button
              intent="secondary"
              class="flex-1"
              onClick={() => setConfirmReset(false)}
            >
              {t.cancel}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
