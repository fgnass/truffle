import "./app.css";
import { Scene } from "./three/scene";
import _ from "lodash";
import { Player } from "./player";
import { setResult, throwing } from "./state";

export function App() {
  return (
    <>
      <Scene numberOfDice={throwing.value} onResult={setResult} />
      <main>
        <Player />
      </main>
    </>
  );
}
