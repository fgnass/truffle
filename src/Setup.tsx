import { Toggle } from "./Toggle";
import {
  players,
  addPlayer,
  removePlayer,
  start,
  virtualDice,
  i18n,
  computerPlayer,
} from "./state";
import { Button } from "./styled";

export function Setup() {
  return (
    <div class="flex-1 flex flex-col items-center justify-center gap-3 p-3">
      <div>{i18n.value.numberOfPlayers}</div>
      <div class="flex gap-3 items-center">
        <Button onClick={removePlayer}>-</Button>
        <div>{players.value.length}</div>
        <Button onClick={addPlayer}>+</Button>
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
    </div>
  );
}
