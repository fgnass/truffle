import { styled, tw } from "classname-variants/preact";
import { i18n } from "../state";
import type { ScoreEntry } from "../stats";
import { Badge } from "./Badge";
import { RankBadge } from "./RankBadge";

// A high-score row. `highlight` tints a current-round player; `interactive`
// turns the row into a tappable button (opens that player's stats). Both live in
// the variant map instead of stacked ternaries on the className.
const Row = styled("li", {
  base: tw`flex items-center gap-2 rounded-lg px-2 py-1.5`,
  variants: {
    highlight: { true: tw`bg-primary-200/60` },
    interactive: {
      true: tw`cursor-pointer transition hover:bg-primary-200/80 active:scale-[0.99]`,
    },
  },
});

// The all-time high-score board, shared by the Stats screen and the end-of-game
// leaderboard dialog. Callers supply the rows (already sorted + sliced) so the
// same list renders identically wherever it appears.
//
// `highlight` emphasises a set of names (the current round's players).

// Highscore annotation pill: celebrate clean games (emerald), otherwise note
// Piggy usage (muted violet — never gray).
function ScoreTag({ e }: { e: ScoreEntry }) {
  const t = i18n.value;
  if (e.flawless || e.adviceCount === 0) {
    return (
      <Badge tone="clean">{e.flawless ? t.flawlessBadge : t.noPiggyTag}</Badge>
    );
  }
  return <Badge tone="piggy">{t.piggyTimes(e.adviceCount)}</Badge>;
}

const keyFor = (e: ScoreEntry) => `${e.name}-${e.date}-${e.score}`;

export function HighScoreList({
  rows,
  highlight,
  onSelect,
  title = true,
  medals = false,
  class: cls = "",
}: {
  rows: ScoreEntry[];
  highlight?: Set<string>;
  // When given, each row becomes a button that opens that player's stats.
  onSelect?: (name: string) => void;
  // Show the "High scores" heading (off when a caller supplies its own header).
  title?: boolean;
  // Use the big gold/silver/bronze podium coins (as on the end-game scoreboard)
  // instead of the compact rank chips.
  medals?: boolean;
  class?: string;
}) {
  const t = i18n.value;
  return (
    <div class={cls}>
      {title && (
        <h2 class="mb-2 text-base font-bold text-ink">{t.lbHighScore}</h2>
      )}
      {rows.length === 0 ? (
        <p class="py-2 text-sm text-primary-400">{t.emptyBoard}</p>
      ) : (
        <ul class="flex flex-col gap-px">
          {rows.map((e, i) => (
            <Row
              key={keyFor(e)}
              highlight={!!highlight?.has(e.name)}
              interactive={!!onSelect}
              onClick={onSelect ? () => onSelect(e.name) : undefined}
            >
              <RankBadge rank={i + 1} size={medals ? "md" : "sm"} />
              <span class="flex-1 truncate font-medium text-ink">{e.name}</span>
              <ScoreTag e={e} />
              <span class="font-digits text-lg text-ink">{e.score}</span>
            </Row>
          ))}
        </ul>
      )}
    </div>
  );
}
