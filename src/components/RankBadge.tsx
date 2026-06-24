import { Medal } from "./Medal";

const MEDAL_KIND = ["gold", "silver", "bronze"] as const;

// Compact podium chips for the `sm` treatment — flat Tailwind-named colours,
// drawn in-app (not emoji) so they match the look and render identically
// everywhere. The `md` treatment delegates to the Medal coins instead.
const CHIP = [
  "bg-amber-300 text-amber-900 ring-amber-500/50",
  "bg-neutral-200 text-primary-700 ring-neutral-400/50",
  "bg-orange-300 text-orange-900 ring-orange-600/50",
];

// The rank badge shared by the high-score list (`sm`) and the end-game
// scoreboard / leaderboard (`md`): a gold/silver/bronze treatment for the top
// three, a muted rank number for the rest. One `size` axis so callers render a
// rank without branching on context. `md` uses the flip-in Medal coins; `sm`
// uses flat chips. Static (no coin-flip) so callers own any reveal motion.
export function RankBadge({
  rank,
  size = "md",
}: {
  rank: number;
  size?: "sm" | "md";
}) {
  const top3 = rank <= 3;

  if (size === "sm") {
    if (top3) {
      return (
        <span
          class={`emboss flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${CHIP[rank - 1]}`}
        >
          {rank}
        </span>
      );
    }
    return (
      <span class="w-6 shrink-0 text-center font-digits text-primary-400">
        {rank}
      </span>
    );
  }

  if (top3) {
    return <Medal kind={MEDAL_KIND[rank - 1]} rank={rank} animate={false} />;
  }
  return (
    <span class="emboss grid size-11 shrink-0 place-items-center rounded-full bg-primary-100 font-digits text-lg text-primary-500 ring-1 ring-primary-300/70">
      {rank}
    </span>
  );
}
