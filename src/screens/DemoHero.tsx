import { Pig } from "../components/Pig";
import { TruffleLogo } from "../components/TruffleLogo";
import { Scene } from "../components/VirtualDice";
import { HERO_LAYOUT } from "../demo";

// A marketing composition that exists nowhere in the actual game: the logo on
// the app's purple backdrop with the 3D dice frozen in flight in front of it.
// Rendered only in `?demo=hero` (see src/demo.ts) for a portfolio hero shot.
export function DemoHero() {
  return (
    <div class="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-ink">
      {/* Nudged up from dead-centre so the falling dice frame it from the sides
          and below rather than landing on top of the wordmark. */}
      <div class="flex -translate-y-[12vh] flex-col items-center">
        <Pig class="drop-emboss h-auto w-64 translate-x-2 text-primary-950" />
        <TruffleLogo class="drop-emboss relative -mt-9 h-auto w-64" />
      </div>
      <Scene numberOfDice={0} demo={HERO_LAYOUT} onResult={() => {}} />
    </div>
  );
}
