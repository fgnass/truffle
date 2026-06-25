import { registerSW } from "virtual:pwa-register";
import { render } from "preact";
import { App } from "./App.tsx";
import { initData } from "./strategy.ts";
import { initFromUrl } from "./net.ts";
import { applyDemo } from "./demo.ts";
import "./index.css";

registerSW({ immediate: true });
initData();
// A #room=<id> link opens the guest join form straight away.
initFromUrl();
// `?demo=<scene>` stages a scripted frame for screenshots; no-op otherwise.
applyDemo();

render(<App />, document.getElementById("app")!);
