import _ from "lodash";
import { Game } from "./game";
import { started } from "./state";
import { Setup } from "./setup";

export function App() {
  return started.value ? <Game /> : <Setup />;
}
