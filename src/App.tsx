import _ from "lodash";
import { Game } from "./Game";
import { allPlayersNamed, started } from "./state";
import { Setup } from "./Setup";
import { PlayerNames } from "./PlayerNames";

export function App() {
  console.log(allPlayersNamed.value);
  if (!started.value) return <Setup />;
  //if (!allPlayersNamed.value) return <PlayerNames />;
  return <Game />;
}
