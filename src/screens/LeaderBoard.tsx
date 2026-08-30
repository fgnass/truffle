import { useSignal } from "@preact/signals";
import { Trophy } from "lucide-preact";
import { i18n, online, players, replayWithParty } from "../state";
import { isRoomHost, rematch } from "../net";
import { highScores } from "../stats";
import { Button } from "../components/Button";
import { HighScoreList } from "../components/HighScoreList";
import { Modal } from "../components/Modal";
import { PlayerStatsModal } from "../components/PlayerStatsModal";
import { SettingsButton } from "../components/SettingsButton";
import { ResultCeremony } from "../components/ResultCeremony";
import { StitchedCard } from "../components/card";

// The all-time board, shown inside the high-score modal. Renders the live board
// directly — the modal's own entrance is the only animation; the rows don't each
// run a separate view transition.
function HighScoresPanel({
  roster,
  onSelect,
}: {
  roster: Set<string>;
  onSelect: (name: string) => void;
}) {
  return (
    <HighScoreList
      rows={highScores(undefined, 10)}
      highlight={roster}
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

  const settings = <SettingsButton class="absolute top-4 right-4 z-10" />;

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
        <h1 class="drop-emboss font-logo text-3xl leading-none tracking-tight text-white">
          {t.resultsTitle}
        </h1>

        <StitchedCard class="w-full max-w-sm p-5">
          <ResultCeremony
            solo={false}
            finished={finished}
            onSelect={(name) => openPlayer(name)}
          />
        </StitchedCard>

        {/* Always reserve the button's slot so the card stays put when the
            ceremony finishes and the "Highscores" button fades in. */}
        <div class="flex h-9 items-center justify-center">
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
      </div>

      {/* Single, unambiguous action: back to the roster with this party pre-picked.
          Online it becomes a rematch instead — the room and every peer connection
          stay up, so the same party plays on without scanning anything again.
          Only the host can trigger it; the others simply wait, exactly as they
          did in the lobby. Either side can still leave via Settings. */}
      <div class="flex flex-col items-center px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {online.value && !isRoomHost.value ? (
          <p class="flex h-11 items-center text-sm font-semibold text-white/80">
            {t.waitingForHost}
          </p>
        ) : (
          <Button
            class="w-full max-w-sm"
            onClick={online.value ? rematch : replayWithParty}
          >
            {t.playAgain}
          </Button>
        )}
      </div>

      {showScores.value && (
        <Modal
          onClose={() => (showScores.value = false)}
          class="w-full max-w-sm"
        >
          <h2 class="mb-2 pr-8 text-base font-bold text-ink">
            {t.lbHighScore}
          </h2>
          <HighScoresPanel
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
