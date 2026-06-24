import { Signal, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { Trophy } from "lucide-preact";
import { i18n, players, replayWithParty } from "../state";
import { highScores, highScoresBefore } from "../stats";
import { Button } from "../components/Button";
import { HighScoreList } from "../components/HighScoreList";
import { Modal } from "../components/Modal";
import { PlayerStatsModal } from "../components/PlayerStatsModal";
import { SettingsButton } from "../components/SettingsButton";
import { ResultCeremony } from "../components/ResultCeremony";
import { stitchedCard } from "../components/card";

const CARD = `w-full max-w-sm p-5 text-ink ${stitchedCard}`;

const reduceMotion =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// Run a state change inside a view transition so elements carrying a
// view-transition-name FLIP between their old and new layout.
function transition(apply: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => Promise<void> | void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };
  if (reduceMotion || !doc.startViewTransition) return apply();
  const vt = doc.startViewTransition(async () => {
    apply();
    await Promise.resolve();
    await Promise.resolve();
  });
  vt.ready?.catch(() => {});
}

// The all-time board, shown inside the high-score modal. It mounts showing the
// scores as they stood *before* this game, then transitions to the live board
// the first time it's opened, so the freshly-recorded scores are seen sliding
// into their ranked positions. `revealed` lives in the parent so re-opening the
// modal doesn't replay the insertion.
function HighScoresPanel({
  revealed,
  roster,
  onSelect,
}: {
  revealed: Signal<boolean>;
  roster: Set<string>;
  onSelect: (name: string) => void;
}) {
  const rows = revealed.value ? highScores(undefined, 10) : highScoresBefore(10);
  useEffect(() => {
    if (!revealed.value) transition(() => (revealed.value = true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <HighScoreList
      rows={rows}
      highlight={roster}
      vtPrefix="hs"
      onSelect={onSelect}
      title={false}
      medals
    />
  );
}

export function LeaderBoard() {
  const t = i18n.value;
  // A solo game (one human, no Piggy) has no ranking to stage — it plays a quick
  // personal tally and slides into Stats from inside the ceremony.
  const solo = players.value.length === 1;
  // Flipped by the ceremony once the podium has settled; only then does the
  // "Highscores" button appear, so the scoring beat plays alone first.
  const finished = useSignal(false);
  // Modal state: the high-score board and/or a single player's stats. Opening a
  // player from the board remembers to step back to it on close.
  const showScores = useSignal(false);
  const player = useSignal<string | null>(null);
  const playerFromScores = useSignal(false);
  const revealedAll = useSignal(false);

  const settings = (
    <SettingsButton class="absolute right-4 top-4 z-10" />
  );

  if (solo) {
    return (
      <div class="relative py-6">
        {settings}
        <ResultCeremony solo finished={finished} />
      </div>
    );
  }

  const roster = new Set(players.value.map((p) => p.name.value ?? ""));
  const openPlayer = (name: string, fromScores = false) => {
    player.value = name;
    playerFromScores.value = fromScores;
    showScores.value = false;
  };

  return (
    <div class="relative flex h-full flex-col">
      {settings}

      <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pt-16">
        <h1 class="font-logo text-3xl leading-none tracking-tight text-white drop-emboss">
          {t.resultsTitle}
        </h1>

        <div class={CARD}>
          <ResultCeremony
            solo={false}
            finished={finished}
            onSelect={(name) => openPlayer(name)}
          />
        </div>

        {finished.value && (
          <Button
            intent="ghost"
            onClick={() => (showScores.value = true)}
            class="animate-fadeIn gap-1.5 bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
          >
            <Trophy class="size-4" />
            {t.lbHighScore}
          </Button>
        )}
      </div>

      {/* Single, unambiguous action: back to the roster with this party pre-picked. */}
      <div class="flex flex-col items-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <Button class="w-full max-w-sm" onClick={replayWithParty}>
          {t.playAgain}
        </Button>
      </div>

      {showScores.value && (
        <Modal onClose={() => (showScores.value = false)} class="w-full max-w-sm">
          <h2 class="mb-2 pr-8 text-base font-bold text-ink">{t.lbHighScore}</h2>
          <HighScoresPanel
            revealed={revealedAll}
            roster={roster}
            onSelect={(name) => openPlayer(name, true)}
          />
        </Modal>
      )}

      {player.value && (
        <PlayerStatsModal
          name={player.value}
          onClose={() => (player.value = null)}
          onBack={
            playerFromScores.value
              ? () => {
                  player.value = null;
                  showScores.value = true;
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
