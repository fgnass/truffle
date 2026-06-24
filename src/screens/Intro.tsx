import { useState } from "preact/hooks";
import { closeIntro, i18n } from "../state";
import { Button } from "../components/Button";
import { StartLogo } from "../components/StartLogo";
import { SettingsButton } from "../components/SettingsButton";
import { stitchedCard } from "../components/card";

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
    <div class="relative flex-1 flex flex-col overflow-hidden px-5 py-6 text-white">
      <SettingsButton class="absolute right-4 top-4 z-10" />

      <div class="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex min-h-full flex-col items-center justify-center gap-5 py-2">
          {/* Piggy stands behind the logo, both white with the same dark outline */}
          <StartLogo />

          <div
            class={`w-full max-w-sm p-6 text-ink flex flex-col items-center gap-4 ${stitchedCard}`}
          >
            {/* All slides share one grid cell, so the card is as tall as the
                longest one and never jumps; only the active slide is visible. */}
            <div class="grid text-center">
              {slides.map((s, i) => (
                <div
                  key={i}
                  class={`[grid-area:1/1] flex flex-col gap-2.5 transition-opacity ${
                    i === step ? "" : "invisible opacity-0"
                  }`}
                >
                  <h2 class="font-logo text-2xl text-ink">{s.title}</h2>
                  <p class="text-[0.95rem] leading-snug text-primary-900">
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
          </div>
        </div>
      </div>
    </div>
  );
}
