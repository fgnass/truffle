import { useState } from "preact/hooks";
import {
  applyPiggyKeep,
  applyPiggyMove,
  currentPlayerState,
  i18n,
  piggyHints,
  piggyTips,
  rollAnyway,
} from "../state";
import { PigIcon } from "./PigIcon";
import { Button } from "./Button";
import { ToggleRow } from "./ToggleRow";
import Die from "./Die";
import { Dialog } from "./Dialog";

// Floating, playful modal shown when the player strays from Piggy's optimal
// play — either after entering a suboptimal category (piggyPick, reactive) or
// before re-rolling a suboptimal dice selection (piggyKeep, proactive). With
// "reveal directly" off it first asks whether to reveal the better move.
// Mounted only while one of the hints is set, so its local "revealed" state
// resets for each new hint.
//
// Concentric corners: pill buttons sit p-5 (1.25rem) inside the card, so the
// card radius keeps the curves parallel; the dashed "stitched" seam is an
// outline, which follows the card radius automatically.
export function PiggyHint() {
  const t = i18n.value;
  const [revealed, setRevealed] = useState(false);
  const { piggyPick, piggyKeep } = currentPlayerState.value;

  const keepDice = piggyKeep.value;
  const isKeep = keepDice !== null;
  const showPick = piggyTips.value || revealed;

  const apply = isKeep ? applyPiggyKeep : applyPiggyMove;
  // Secondary action: for a keep hint, roll with the player's own selection;
  // for a category hint, keep the entry that was already made. There is no
  // consequence-free way back to the dice — otherwise the player could peek at
  // Piggy's pick, dismiss, copy it and still bank the combo. The backdrop tap
  // therefore commits this same action rather than just closing.
  const proceed = isKeep ? rollAnyway : () => (piggyPick.value = null);

  // Turning the feature off mid-hint also commits the current move (and stops
  // future hints).
  const disable = () => {
    piggyHints.value = false;
    proceed();
  };

  return (
    // dim + click-away backdrop — commits "proceed", never a free peek. The
    // `soft` scrim keeps the board behind readable mid-turn.
    <Dialog
      scrim="soft"
      onClose={proceed}
      class="relative flex w-full max-w-xs flex-col gap-4 p-5"
    >
      <div class="flex items-center gap-3 px-1 pt-1">
        <PigIcon class="h-auto w-10 shrink-0 rounded-full text-primary-900 drop-shadow-[0_1px_0_rgba(0,0,0,0.18)]" />
        <p class="text-body leading-snug text-primary-900">
          {t.notPiggysBest}
          {showPick && (
            <>
              {" "}
              <span class="font-semibold text-primary-800">
                {isKeep
                  ? t.piggyWouldKeep
                  : t.piggyWouldPick(t.categoryNames[piggyPick.value!])}
              </span>
            </>
          )}
        </p>
      </div>

      {showPick && isKeep && (
        <div class="flex justify-center gap-1.5 text-body">
          {keepDice!.map((v, i) => (
            <Die key={i} value={v} flat />
          ))}
        </div>
      )}

      {showPick ? (
        <>
          <div class="flex flex-col gap-2">
            <Button size="sm" class="w-full" onClick={apply}>
              {t.applyMove}
            </Button>
            <Button
              intent="secondary"
              size="sm"
              class="w-full"
              onClick={proceed}
            >
              {isKeep ? t.rollAnyway : t.keepMove}
            </Button>
          </div>
          <ToggleRow
            label={t.alwaysShowTips}
            class="gap-2 px-2 text-[0.8rem] text-primary-900/80"
            toggleClass="text-[0.62rem]"
            checked={piggyTips.value}
            onChange={(v) => {
              piggyTips.value = v;
              setRevealed(true);
            }}
          />
        </>
      ) : (
        <>
          <div class="flex flex-col gap-2">
            <Button size="sm" class="w-full" onClick={() => setRevealed(true)}>
              {t.show}
            </Button>
            <Button
              intent="secondary"
              size="sm"
              class="w-full"
              onClick={proceed}
            >
              {isKeep ? t.rollAnyway : t.ignore}
            </Button>
          </div>
          <ToggleRow
            label={t.piggyHints}
            class="gap-2 px-2 text-[0.8rem] text-primary-900/80"
            toggleClass="text-[0.62rem]"
            checked={piggyHints.value}
            onChange={(v) => {
              if (!v) disable();
            }}
          />
        </>
      )}
    </Dialog>
  );
}
