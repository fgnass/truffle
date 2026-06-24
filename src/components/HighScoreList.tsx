import { i18n } from "../state";
import type { ScoreEntry } from "../stats";
import { Badge } from "./Badge";
import { RankBadge } from "./RankBadge";

// The all-time high-score board, shared by the Stats screen and the end-of-game
// leaderboard dialog. Callers supply the rows (already sorted + sliced) so the
// same list renders identically wherever it appears.
//
// `highlight` emphasises a set of names (the current round's players). `vtPrefix`
// opts each row into a view-transition-name keyed by its identity — a parent can
// then swap the `rows` array inside document.startViewTransition() and the rows
// will FLIP to their new positions while freshly-inserted rows fade in.

// Top-3 get a gold/silver/bronze sticker; the rest a muted rank number. Drawn
// in-app (not emoji) so it matches the look and renders identically everywhere.
const PODIUM = [
  "bg-amber-300 text-amber-900 ring-amber-500/50",
  "bg-neutral-200 text-primary-700 ring-neutral-400/50",
  "bg-orange-300 text-orange-900 ring-orange-600/50",
];

function Rank({ i }: { i: number }) {
  if (i < 3) {
    return (
      <span
        class={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 emboss ${PODIUM[i]}`}
      >
        {i + 1}
      </span>
    );
  }
  return (
    <span class="w-6 shrink-0 text-center font-digits text-primary-400">
      {i + 1}
    </span>
  );
}

// Highscore annotation pill: celebrate clean games (emerald), otherwise note
// Piggy usage (muted violet — never gray).
function ScoreTag({ e }: { e: ScoreEntry }) {
  const t = i18n.value;
  if (e.flawless || e.adviceCount === 0) {
    return (
      <Badge tone="clean">
        {e.flawless ? t.flawlessBadge : t.noPiggyTag}
      </Badge>
    );
  }
  return <Badge tone="piggy">{t.piggyTimes(e.adviceCount)}</Badge>;
}

const keyFor = (e: ScoreEntry) => `${e.name}-${e.date}-${e.score}`;

export function HighScoreList({
  rows,
  highlight,
  vtPrefix,
  onSelect,
  title = true,
  medals = false,
  class: cls = "",
}: {
  rows: ScoreEntry[];
  highlight?: Set<string>;
  vtPrefix?: string;
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
      {title && <h2 class="mb-2 text-base font-bold text-ink">{t.lbHighScore}</h2>}
      {rows.length === 0 ? (
        <p class="py-2 text-sm text-primary-400">{t.emptyBoard}</p>
      ) : (
        <ul class="flex flex-col gap-px">
          {rows.map((e, i) => (
            <li
              key={keyFor(e)}
              style={
                vtPrefix
                  ? { viewTransitionName: `${vtPrefix}-${keyFor(e)}` }
                  : undefined
              }
              onClick={onSelect ? () => onSelect(e.name) : undefined}
              class={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                highlight?.has(e.name) ? "bg-primary-200/60" : ""
              } ${
                onSelect
                  ? "cursor-pointer transition hover:bg-primary-200/80 active:scale-[0.99]"
                  : ""
              }`}
            >
              {medals ? <RankBadge rank={i + 1} /> : <Rank i={i} />}
              <span class="flex-1 truncate font-medium text-ink">{e.name}</span>
              <ScoreTag e={e} />
              <span class="font-digits text-lg text-ink">{e.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
