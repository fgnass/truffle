import { useComputed, useSignal } from "@preact/signals";
import { ChevronLeft } from "lucide-preact";
import {
  closeStats,
  gameFinished,
  i18n,
  replayWithParty,
  started,
  statsRoster,
} from "../state";
import { games, highScores } from "../stats";
import { Button } from "../components/Button";
import { StitchedCard } from "../components/card";
import { HighScoreList } from "../components/HighScoreList";
import { IconButton } from "../components/IconButton";
import { PlayerStatsModal } from "../components/PlayerStatsModal";
import { Segmented } from "../components/Segmented";
import { SettingsButton } from "../components/SettingsButton";

export function Stats() {
  const t = i18n.value;
  const hasRoster = statsRoster.value.length > 0;
  // Default to the round scope when opened with a roster (mid-game / post-game).
  const scoped = useSignal(hasRoster);
  // The player whose stats are open as a floating card (null = none).
  const selected = useSignal<string | null>(null);

  const roster = useComputed(() =>
    scoped.value && hasRoster ? statsRoster.value : undefined,
  );
  // Point out the current round's players, but only in the all-time view —
  // in round scope every row is already one of them.
  const highlight = useComputed(() =>
    scoped.value ? new Set<string>() : new Set(statsRoster.value),
  );
  const rows = useComputed(() => highScores(roster.value));

  const empty = games.value.length === 0;

  return (
    <div class="flex flex-1 flex-col gap-5 py-8 text-white">
      <div class="mx-auto flex w-full max-w-sm items-center gap-2 px-5">
        <IconButton tone="overlay" onClick={closeStats} aria-label={t.back}>
          <ChevronLeft class="size-5" />
        </IconButton>
        <h1 class="drop-emboss font-logo text-3xl leading-none tracking-tight [-webkit-text-stroke:6px_theme(colors.ink)] [paint-order:stroke]">
          {t.statsTitle}
        </h1>
        <SettingsButton class="ml-auto" />
      </div>

      {hasRoster && (
        <div class="mx-auto w-full max-w-sm px-5">
          <Segmented
            value={scoped.value}
            onChange={(v) => (scoped.value = v)}
            options={[
              { value: false, label: t.scopeAll },
              { value: true, label: t.scopeRound },
            ]}
          />
        </div>
      )}

      {empty ? (
        <p class="mt-10 text-center text-white/80">{t.noGamesYet}</p>
      ) : (
        <div class="mx-auto flex w-full max-w-sm flex-col items-center gap-3 px-5">
          <StitchedCard class="w-full max-w-sm p-5">
            <HighScoreList
              rows={rows.value}
              highlight={highlight.value}
              onSelect={(name) => (selected.value = name)}
            />
          </StitchedCard>
          {rows.value.length > 0 && (
            <p class="text-center text-xs text-white/60">{t.tapForStats}</p>
          )}
        </div>
      )}

      {/* A solo game ends here (it has no podium), so this is its only way back
          to a new game — pinned to the bottom like the leaderboard's. Shown for
          any finished game being viewed, not the all-time/mid-game stats. */}
      {started.value && gameFinished.value && (
        <div class="mx-auto mt-auto w-full max-w-sm px-5">
          <Button class="w-full" onClick={replayWithParty}>
            {t.playAgain}
          </Button>
        </div>
      )}

      {selected.value && (
        <PlayerStatsModal
          name={selected.value}
          onClose={() => (selected.value = null)}
        />
      )}
    </div>
  );
}
