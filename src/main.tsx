import { render } from "preact";
import { App } from "./app.tsx";
import { initData } from "./strategy.ts";

render(<App />, document.getElementById("app")!);

initData();
