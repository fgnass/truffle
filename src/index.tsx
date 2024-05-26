import { registerSW } from "virtual:pwa-register";
import { render } from "preact";
import { App } from "./App.tsx";
import { initData } from "./strategy.ts";
import "./index.css";

registerSW({ immediate: true });
initData();

render(<App />, document.getElementById("app")!);
