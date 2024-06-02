import _ from "lodash";
import { Game } from "./screens/Game";
import { allPlayersNamed, gameFinished, started } from "./state";
import { Setup } from "./screens/Setup";
import { PlayerNames } from "./screens/PlayerNames";
import { LeaderBoard } from "./screens/LeaderBoard";

export function App() {
  if (!started.value) return <Setup />;
  if (!allPlayersNamed.value) return <PlayerNames />;
  if (gameFinished.value) return <LeaderBoard />;
  return <Game />;
}
