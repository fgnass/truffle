import { useSignal } from "@preact/signals";
import PlayerNameInput from "./PlayerNameInput";
import { players } from "./state";
import { Button } from "./styled";

export function PlayerNames() {
  const num = useSignal(0);
  const name = useSignal<string | null>(null);
  return (
    <div class="p-6 space-y-3">
      <div class="font-bold text-xl">Who is playing?</div>
      <p>Enter a name or select one from the list of previous players:</p>
      <div class="font-bold">Player {num.value + 1}</div>
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
          Next
        </Button>
      )}
    </div>
  );
}
