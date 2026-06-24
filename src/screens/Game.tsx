import Die from "../components/Die";
import { Redo2, Undo2 } from "lucide-preact";
import { PigIcon } from "../components/PigIcon";
import { IconButton } from "../components/IconButton";
import { SettingsButton } from "../components/SettingsButton";
import { useEffect, useRef } from "preact/hooks";
import {
  currentPlayerState,
  i18n,
  assignScore,
  select,
  rollDice,
  undo,
  round,
  throwing,
  setResult,
  nextPlayer,
  players,
  currentPlayer,
  digging,
  computerPlayer,
  shaking,
  shakingActive,
  nudging,
  motionAvailable,
  online,
  waiting,
  waitingFor,
} from "../state";
import { Scene } from "../components/VirtualDice";
import { Button } from "../components/Button";
import { Pig } from "../components/Pig";
import { ScoreSheet } from "../components/ScoreSheet";
import { PiggyHint } from "../components/PiggyHint";
import { PlayerStrip } from "../components/PlayerStrip";

const SHAKE_THRESHOLD = 22;
const SHAKE_COOLDOWN_MS = 900;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useDeviceShake(enabled: boolean, onShake: () => void) {
  const lastShakeAt = useRef(0);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    if (!enabled) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration =
        event.accelerationIncludingGravity ?? event.acceleration;
      if (!acceleration) return;

      const x = acceleration.x ?? 0;
      const y = acceleration.y ?? 0;
      const z = acceleration.z ?? 0;
      const force = Math.sqrt(x * x + y * y + z * z);
      const now = performance.now();

      if (
        force < SHAKE_THRESHOLD ||
        now - lastShakeAt.current < SHAKE_COOLDOWN_MS
      ) {
        return;
      }

      lastShakeAt.current = now;
      // Haptic feedback for the registered shake (Android; iOS Safari has no
      // Vibration API and silently ignores this).
      navigator.vibrate?.(30);
      onShakeRef.current();
    };

    window.addEventListener("devicemotion", handleMotion, { passive: true });
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [enabled]);
}

function useDeviceTilt(targetRef: { current: HTMLElement | null }) {
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const target = targetRef.current;
      if (!target) return;

      const gamma = clamp(event.gamma ?? 0, -28, 28);
      const beta = clamp(event.beta ?? 0, -28, 28);
      target.style.setProperty("--tilt-x", `${(-beta / 28) * 7}deg`);
      target.style.setProperty("--tilt-y", `${(gamma / 28) * 7}deg`);
      target.style.setProperty("--shadow-x", `${(gamma / 28) * 0.45}em`);
      target.style.setProperty("--shadow-y", `${0.5 + (beta / 28) * 0.18}em`);
    };

    window.addEventListener("deviceorientation", handleOrientation, {
      passive: true,
    });
    return () =>
      window.removeEventListener("deviceorientation", handleOrientation);
  }, [targetRef]);
}

export function Game() {
  const {
    roll,
    selection,
    throwNum,
    prevState,
    perfect,
    roundComplete,
    combo,
    badgeFlawless,
    piggyPick,
    piggyKeep,
    adviceNeeded,
    name,
    human,
  } = currentPlayerState.value;

  const t = i18n.value;
  // Three ways to throw, three wordings. A confirmed motion sensor wins: "shake
  // to throw". Otherwise a coarse pointer (phone/tablet without sensor access)
  // swipes across the screen, and a fine pointer moves the mouse.
  const isTouch =
    typeof matchMedia !== "undefined" &&
    matchMedia("(pointer: coarse)").matches;
  const variant = (motion: string, touch: string, mouse: string) =>
    motionAvailable.value ? motion : isTouch ? touch : mouse;
  const rollComplete = roll.value.length === 5;
  const selected = selection.value.filter(Boolean).length;
  const throwInProgress = throwing.value > 0;
  const lastThrow = throwNum.value >= 3;
  const diceTiltRef = useRef<HTMLDivElement>(null);

  // Once the dice settle (roll complete) the hint + controls share the dice
  // cascade's beat: they re-mount on each settle and fade in after the dice have
  // landed (see the .deal-in rule). Before the first roll, or while throwing,
  // there is nothing to wait on, so they appear at once.
  const dealIn = rollComplete ? "deal-in" : "";

  const shouldAssign = human && (selected === 5 || (lastThrow && rollComplete));

  const shouldSelect = human && rollComplete && throwNum.value < 3 && !selected;

  const canThrow =
    human &&
    round.value <= 13 &&
    !digging.value &&
    !lastThrow &&
    !throwInProgress &&
    !waiting.value &&
    selected < 5;

  // Shaking only kicks off a throw while nothing is kept yet (the first roll, or
  // a re-roll of everything). Once the player has picked keepers, a deliberate
  // tap on the roll button is required, so handling the phone to select dice
  // can't trigger an unintended re-roll.
  const canShakeDice =
    human &&
    round.value <= 13 &&
    !digging.value &&
    !lastThrow &&
    !waiting.value &&
    !selected;

  useDeviceShake(canShakeDice, () => {
    // While a throw is in progress the Scene reads device motion directly to
    // drive the cup; a shake only kicks off a new roll.
    if (throwing.value === 0 && canThrow) rollDice();
  });
  useDeviceTilt(diceTiltRef);

  return (
    <div class="mx-auto flex w-[min(100%,440px)] flex-1 flex-col gap-3 px-2 py-2 text-base sm:py-4">
      {online.value && <PlayerStrip />}
      <div class="paper-pad relative flex flex-col overflow-hidden rounded-xs border border-white/70 bg-white p-4 [view-transition-name:surface] sm:p-5">
        <div class="mb-4 flex min-h-10 items-start justify-between gap-3">
          <h1 class="flex min-h-8 flex-wrap items-baseline gap-x-2 gap-y-1 leading-none">
            <span
              key={currentPlayer.value}
              class="name-in font-digits text-[1.7rem] leading-none text-ink"
            >
              {name.value}
            </span>
            {throwNum.value > 0 && throwNum.value <= 3 ? (
              <span class="text-sm font-normal text-neutral-500">
                {t.rollX(throwNum.value)}
              </span>
            ) : players.value.length === 1 ? (
              <span class="text-sm font-normal text-neutral-500">
                {t.roundX(round.value)}
              </span>
            ) : null}
          </h1>
          <div class="flex shrink-0 items-center gap-2">
            {human && prevState.value && (
              <IconButton
                tone="light"
                size="lg"
                raised
                class="shrink-0"
                onClick={undo}
                aria-label={prevState.value.redo ? "Redo" : "Undo"}
              >
                {prevState.value.redo ? <Redo2 /> : <Undo2 />}
              </IconButton>
            )}
            <SettingsButton tone="light" size="lg" raised class="shrink-0" />
          </div>
        </div>
        <ScoreSheet
          player={currentPlayerState.value}
          prevScores={prevState.value?.scores}
          onAssign={assignScore}
          class="mb-4 gap-x-3 sm:gap-x-4"
        />
        <div ref={diceTiltRef} class="relative mt-3 [perspective:760px]">
          <div
            class={`dice-rack ${
              throwInProgress ? "invisible" : ""
            } grid min-h-[3em] grid-cols-5 gap-[clamp(0.35rem,1.5vw,0.5rem)] text-[clamp(0.92rem,3.8vw,1rem)]`}
          >
            {roll.value.map((value, i) => (
              <Die
                key={i}
                value={value}
                onPress={() => {
                  if (roll.value.length === 5) select(i);
                }}
                selected={selection.value[i] || throwNum.value >= 3}
              />
            ))}
          </div>
          <div class="mt-4 min-h-6 text-center text-[0.82em] font-medium text-neutral-500">
            {shaking.value && (
              <span class="inline-block animate-pulse text-primary-600">
                {shakingActive.value
                  ? variant(t.stopHintMotion, t.stopHintTouch, t.stopHint)
                  : variant(t.shakeHintMotion, t.shakeHintTouch, t.shakeHint)}
              </span>
            )}
            {nudging.value && (
              <span class="inline-block animate-pulse text-primary-600">
                {t.nudgeHint}
              </span>
            )}
            {shouldSelect && (
              <span class={`inline-block ${dealIn}`}>{t.selectKeepers}</span>
            )}
            {shouldAssign && (
              <span class={`inline-block ${dealIn}`}>{t.pickCategory}</span>
            )}
          </div>
        </div>
        <div class="mt-4 flex min-h-[3.65rem] flex-wrap items-center justify-center gap-2 self-center">
          {canThrow && (
            <Button class={`min-w-44 ${dealIn}`} onClick={() => rollDice()}>
              {selected
                ? t.rollXDice(5 - selected)
                : throwNum.value > 0
                  ? t.reRollAll
                  : t.rollDice}
            </Button>
          )}
          {rollComplete && !adviceNeeded.value && !computerPlayer.value && (
            <Button
              circle
              intent="soft"
              class={`overflow-hidden shadow-subtle shadow-primary-950/20 ${dealIn}`}
              onClick={() => (adviceNeeded.value = true)}
              aria-label="Ask Piggy"
            >
              <PigIcon class="h-full w-full translate-x-1" />
            </Button>
          )}
          {throwNum.value > 3 && !online.value && (
            <Button onClick={nextPlayer}>{t.nextPlayer}</Button>
          )}
          {waiting.value && (
            <div class="flex flex-col items-center gap-1 text-center">
              <span class="font-logo text-lg text-primary-700">
                {t.waitingForPlayers}
              </span>
              <span class="max-w-64 text-sm text-neutral-500">
                {waitingFor.value.join(", ")}
              </span>
            </div>
          )}
        </div>
        {digging.value > 0 && (
          <Pig
            value={digging.value}
            short={!human}
            class="drop-emboss pointer-events-none absolute bottom-0 left-1/2 w-55 -translate-x-1/2 translate-y-0 text-[#8263ED] [--pig-fill:#FFF]"
          />
        )}
      </div>
      <Scene numberOfDice={throwing.value} auto={!human} onResult={setResult} />
      {human && (piggyPick.value !== null || piggyKeep.value !== null) && (
        <PiggyHint />
      )}
      {perfect.value && (
        <div class="pointer-events-none fixed top-[22%] left-1/2 -translate-x-1/2">
          <div class="drop-emboss relative text-center font-logo leading-none tracking-tight [paint-order:stroke]">
            <div
              key={`p${throwNum.value}:${combo.value}`}
              class="animate-fly text-5xl text-primary-600 [-webkit-text-stroke:8px_#fff]"
            >
              {badgeFlawless.value ? t.perfect : t.nice}
            </div>
            {roundComplete.value && combo.value >= 2 && (
              <div
                key={`c${throwNum.value}:${combo.value}`}
                class="absolute inset-x-0 top-0 animate-comboBadge text-4xl text-amber-500 [-webkit-text-stroke:6px_#fff]"
              >
                {t.combo(combo.value)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
