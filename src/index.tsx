import { render } from "preact";
import { App } from "./App.tsx";
import { initData } from "./strategy.ts";
import "./index.css";

render(<App />, document.getElementById("app")!);

initData();
