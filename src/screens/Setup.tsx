import { ShareButton } from "../components/ShareButton";
import { Toggle } from "../components/Toggle";
import {
  players,
  addPlayer,
  removePlayer,
  start,
  virtualDice,
  i18n,
  computerPlayer,
} from "../state";
import { Button } from "../components/Button";

export function Setup() {
  return (
    <div class="flex-1 flex flex-col items-center justify-center gap-3 px-3 py-6 text-lg">
      <div class="flex-1"></div>
      <div>{i18n.value.numberOfPlayers}</div>
      <div class="flex gap-3 items-center">
        <Button circle onClick={removePlayer}>
          –
        </Button>
        <div>{players.value.length}</div>
        <Button circle onClick={addPlayer}>
          +
        </Button>
      </div>
      <label class="flex gap-2 items-center">
        <div>{i18n.value.virtualDice}</div>
        <Toggle
          checked={virtualDice.value}
          onChange={(v) => (virtualDice.value = v)}
        />
      </label>
      <label class="flex gap-2 items-center">
        <div>{i18n.value.computerPlayer}</div>
        <Toggle
          checked={computerPlayer.value}
          onChange={(v) => (computerPlayer.value = v)}
        />
      </label>
      <Button onClick={start}>{i18n.value.start}</Button>
      <div class="flex-1"></div>
      <ShareButton />
    </div>
  );
}
