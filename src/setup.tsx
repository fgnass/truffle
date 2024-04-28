import { players, addPlayer, removePlayer, start, manual, i18n } from "./state";
import { Button } from "./styled";

export function Setup() {
  return (
    <div class="flex-1 flex flex-col items-center justify-center gap-3 p-3">
      <div class="flex gap-3 items-center">
        <Button onClick={removePlayer}>-</Button>
        <div>{players.value.length}</div>
        <Button onClick={addPlayer}>+</Button>
      </div>
      <label class="flex">
        <div>{i18n.value.virtualDice}</div>
        <input
          type="checkbox"
          class="toggle"
          checked={manual}
          onChange={() => (manual.value = !manual.value)}
        />
        <div>{i18n.value.realDice}</div>
      </label>

      <Button onClick={start}>{i18n.value.start}</Button>
    </div>
  );
}
