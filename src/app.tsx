import "./app.css";
import _ from "lodash";
import { Player } from "./player";
import { players, addPlayer, removePlayer, started, start } from "./state";

export function App() {
  return <main>{started.value ? <Player /> : <Setup />}</main>;
}

function Setup() {
  return (
    <div>
      <button onClick={removePlayer}>-</button>
      <div>{players.value.length}</div>
      <button onClick={addPlayer}>+</button>
      <button onClick={start}>Start</button>
    </div>
  );
}
