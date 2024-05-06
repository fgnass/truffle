import _ from "lodash";
import { Game } from "./Game";
import { allPlayersNamed, gameFinished, started } from "./state";
import { Setup } from "./Setup";
import { PlayerNames } from "./PlayerNames";
import { LeaderBoard } from "./LeaderBoard";

export function App() {
  console.log(allPlayersNamed.value);
  if (!started.value) return <Setup />;
  if (!allPlayersNamed.value) return <PlayerNames />;
  if (gameFinished.value) return <LeaderBoard />;
  return <Game />;
}
