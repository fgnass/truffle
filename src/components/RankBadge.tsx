import { Medal } from "./Medal";

const MEDAL_KIND = ["gold", "silver", "bronze"] as const;

// The podium coin shared by the end-game scoreboard and the high-score list:
// a gold/silver/bronze medal for the top three, a muted numbered disc below.
// Static (no coin-flip) so callers own any reveal motion.
export function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <Medal kind={MEDAL_KIND[rank - 1]} rank={rank} animate={false} />;
  }
  return (
    <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary-100 font-digits text-lg text-primary-500 ring-1 ring-primary-300/70 emboss">
      {rank}
    </span>
  );
}
