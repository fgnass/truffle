import { Toggle } from "./Toggle";
import { players, addPlayer, removePlayer, start, manual, i18n } from "./state";
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
        <Toggle checked={manual.value} onChange={(v) => (manual.value = v)} />
        <div>{i18n.value.realDice}</div>
      </label>
      <Button onClick={start}>{i18n.value.start}</Button>
    </div>
  );
}
