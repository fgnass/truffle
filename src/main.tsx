import { render } from "preact";
import { App } from "./app.tsx";

import { initSimulator, simulateGame } from "./advisor/simulator.ts";

render(<App />, document.getElementById("app")!);

async function start() {
  const res = await fetch("/statemap.json");
  const stateMap = await res.json();
  initSimulator({ stateMap });
  console.log("Result", simulateGame());
}

//start();
