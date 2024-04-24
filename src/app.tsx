import "./app.css";
import _ from "lodash";
import { Player } from "./player";
import {
  players,
  addPlayer,
  removePlayer,
  started,
  start,
  manual,
  i18n,
} from "./state";

export function App() {
  return <main>{started.value ? <Player /> : <Setup />}</main>;
}

function Setup() {
  return (
    <div class="stack">
      <div class="flex">
        <button class="big" onClick={removePlayer}>
          -
        </button>
        <div>{players.value.length}</div>
        <button class="big" onClick={addPlayer}>
          +
        </button>
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

      <button class="big" onClick={start}>
        {i18n.value.start}
      </button>
    </div>
  );
}
