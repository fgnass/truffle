import { useSignal } from "@preact/signals";
import PlayerNameInput from "./PlayerNameInput";
import { i18n, players } from "./state";
import { Button } from "./styled";

export function PlayerNames() {
  const num = useSignal(0);
  const name = useSignal<string | null>(null);
  return (
    <div class="p-6 space-y-3">
      <div class="font-bold text-xl">{i18n.value.whoIsPlaying}</div>
      <p>{i18n.value.enterPlayerName}</p>
      <div class="font-bold">{i18n.value.playerX(num.value + 1)}</div>
      <PlayerNameInput selected={name} />
      {!!name.value && (
        <Button
          onClick={() => {
            const player = players.value[num.value];
            if (name.value) {
              player.name.value = name.value;
              num.value++;
              name.value = null;
            }
          }}
        >
          {num.value + 1 === players.value.length
            ? i18n.value.start
            : i18n.value.nextPlayer}
        </Button>
      )}
    </div>
  );
}
