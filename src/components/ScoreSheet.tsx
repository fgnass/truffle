import { i18n, PlayerState } from "../state";
import { ScoreBox } from "./ScoreBox";

// The 13-category score sheet, laid out as two subgrid columns: categories 1–6
// plus the bonus on the left, 7–13 on the right. Shared by the in-game board
// (interactive — pass onAssign, plus prevScores to drive the write-down
// animation when a value was just entered) and the leaderboard scorecard
// (read-only). Layout around the grid (gap, margin) stays with each call site
// via `class`.
export function ScoreSheet({
  player,
  prevScores,
  onAssign,
  class: className = "",
}: {
  player: PlayerState;
  prevScores?: Array<number | null>;
  onAssign?: (cat: number) => void;
  class?: string;
}) {
  const { scores, bonus } = player;
  const t = i18n.value;

  const box = (i: number) => (
    <ScoreBox
      key={i}
      category={t.categoryNames[i]}
      hint={t.categoryHints[i]}
      score={scores.value[i]}
      prevScore={prevScores?.[i]}
      onClick={onAssign ? () => onAssign(i) : undefined}
    />
  );

  return (
    <div class={`grid grid-cols-2 ${className}`}>
      <div class="grid row-span-7 grid-rows-subgrid">
        {scores.value.slice(0, 6).map((_, i) => box(i))}
        <ScoreBox category={t.bonus} hint={t.bonusHint} score={bonus.value} />
      </div>
      <div class="grid row-span-7 grid-rows-subgrid">
        {scores.value.slice(6).map((_, i) => box(i + 6))}
      </div>
    </div>
  );
}
