import { useState } from "preact/hooks";
import { closeIntro, i18n } from "../state";
import { Button } from "../components/Button";
import { StartLogo } from "../components/StartLogo";
import { SettingsButton } from "../components/SettingsButton";
import { StitchedCard } from "../components/card";
import { DialogTitle } from "../components/DialogTitle";

// First-run guided tour. It takes the start screen's place — same animated Pig
// logo on top — with a small carousel card where the roster normally sits,
// introducing the idea (there's a provably best move), Piggy (who knows them
// all), the mentor/rival modes, the train-while-you-play angle and multi-device
// play. Routed via `introOpen` (App), which starts open on first launch and can
// be replayed from the settings sheet. Skipping or finishing both mark it seen.
//
// The header mirrors PlayerNames so the transition between the two is just the
// card morphing; the mascot lives up there, so the slides themselves are
// text-only.
export function Intro() {
  const t = i18n.value;
  const [step, setStep] = useState(0);

  const slides = t.intro;
  const last = step === slides.length - 1;

  const next = () => (last ? closeIntro() : setStep(step + 1));
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div class="relative flex flex-1 flex-col overflow-hidden px-5 py-6 text-white">
      <SettingsButton class="absolute top-4 right-4 z-10" />

      <div class="relative min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div class="flex min-h-full flex-col items-center justify-center gap-5 py-2">
          {/* Piggy stands behind the logo, both white with the same dark outline */}
          <StartLogo />

          <StitchedCard class="flex w-full max-w-sm flex-col items-center gap-4 p-6">
            {/* All slides share one grid cell, so the card is as tall as the
                longest one and never jumps; only the active slide is visible. */}
            <div class="grid text-center">
              {slides.map((s, i) => (
                <div
                  key={i}
                  class={`flex flex-col gap-2.5 transition-opacity [grid-area:1/1] ${
                    i === step ? "" : "invisible opacity-0"
                  }`}
                >
                  <DialogTitle class="flex items-center justify-center gap-1.5">
                    {/* The "Meet Piggy" slide gets a little hand-drawn arrow
                        nodding up to the mascot above the card. */}
                    {i === 1 && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 11 12"
                        class="h-[1em] w-auto shrink-0 [filter:drop-shadow(1px_2px_0_var(--color-primary-300))]"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M9.856 9.712c-.849-.092-4.614.204-5.737.153.294.011-.281-.011 0 0l-.446-.014-.226-.006-.166-.013c-.115-.002-.212-.03-.317-.042-.051-.008-.094-.026-.142-.036a.5.5 0 0 1-.13-.042.85.85 0 0 1-.362-.217.56.56 0 0 1-.145-.283.96.96 0 0 1 .02-.45c.01-.086.055-.179.082-.27.04-.095.08-.179.13-.286l.379-.72c.486-.942 1.539-2.962 1.856-3.7-.109.299.157-.365 0 0 .173.594.115 1.287.298 1.731.137.331.273 1.223.406 1.447.24.405.612-.491.802-.524.297-.05.304-.188.31-1.18.002-.496-.032-1.08-.102-1.724l-.06-.493-.018-.132c-.014-.083-.13-1.652-.13-1.652 0-.69.003-1.221-.4-1.258-.402-.037-1.352.78-1.985 1.157l-.468.281-.228.138-.12.077-.434.288c-.562.382-1.052.75-1.447 1.083-.79.667-1.2 1.2-1.043 1.438.323.001.109.507.323.501.33-.009.923-.503 1.528-.718.346-.123.73-.279 1.14-.46q-.179.223-.369.476a43 43 0 0 0-1.626 2.334l-.443.688c-.08.138-.175.3-.253.46-.072.173-.152.338-.2.532-.115.37-.168.805-.089 1.265.073.457.302.937.66 1.305.092.087.182.181.282.255q.15.11.305.212.157.084.317.162c.107.054.213.084.32.125.427.144.843.204 1.23.214l.29.006.225-.006.446-.013c-.281.01.294-.012 0 0 0 0 2.127-.034 3.237-.034 2.8 0 3.22.053 3-.454-.091-.211.03-.477.152-.74.224-.483.448-.742-.652-.861"
                        />
                      </svg>
                    )}
                    {s.title}
                  </DialogTitle>
                  <p class="text-body leading-snug text-primary-900">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            {/* progress dots */}
            <div class="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <span
                  key={i}
                  class={`h-1.5 rounded-full transition-all ${
                    i === step ? "w-4 bg-primary-600" : "w-1.5 bg-primary-300"
                  }`}
                />
              ))}
            </div>

            <div class="flex w-full gap-2">
              {step > 0 && (
                <Button intent="secondary" class="flex-1" onClick={back}>
                  {t.introBack}
                </Button>
              )}
              <Button class="flex-1" onClick={next}>
                {last ? t.introStart : t.introNext}
              </Button>
            </div>

            {/* Kept in the layout on the last slide (so the card height stays
                constant) but hidden, since "Let's play!" already finishes. */}
            <Button
              intent="ghost"
              onClick={closeIntro}
              aria-hidden={last}
              tabIndex={last ? -1 : 0}
              class={`text-sm font-medium text-primary-700/70 hover:text-primary-900 ${
                last ? "invisible" : ""
              }`}
            >
              {t.introSkip}
            </Button>
          </StitchedCard>
        </div>
      </div>
    </div>
  );
}
