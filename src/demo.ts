import { batch, signal } from "@preact/signals";
import {
  computerPlayer,
  currentPlayer,
  introOpen,
  piggyTips,
  players,
  rollDice,
  roomId,
  rosterDraft,
  startGame,
} from "./state";
import { lobbyMode, lobbyNames } from "./net";
import { games, type GameRecord } from "./stats";
import type { StagedDie } from "./components/VirtualDice";

/**
 * Staging mode for clean portfolio screenshots. Loading the app with
 * `?demo=<scene>` skips the live game and arranges a deterministic, scripted
 * frame instead — so each shot is the *real* UI (the actual roster picker, the
 * actual 3D dice renderer), never a mockup, and stays correct as the app
 * evolves. See `scripts/screenshot.mjs`, which drives the capture.
 *
 * Still scenes (captured by scripts/screenshot.mjs):
 *   ?demo=roster   the player picker with a pre-filled, partly-selected roster
 *   ?demo=dice     a game mid-throw, the 3D dice frozen tumbling onto the felt
 *   ?demo=hero     a marketing composition that exists nowhere in the game:
 *                  the logo on the purple backdrop with dice in flight in front
 *   ?demo=advice   the PiggyHint modal revealed over a game board — the pig's
 *                  optimal-move suggestion (the "would you play like the pig?" beat)
 *   ?demo=lobby    the online host lobby with a QR code to join (P2P multiplayer)
 *
 * The dice/hero scenes are staged by VirtualDice.stageDemo(), which places the
 * dice at fixed positions/orientations and renders a single still frame (no
 * physics, no animation) — that is what makes "some landed, some frozen mid-air"
 * both possible and repeatable. The screenshot script waits on `__truffleDemoReady`.
 *
 * Motion scene (captured by scripts/screencast.mjs as a video):
 *   ?demo=roll     a real game that auto-throws once on load, so the live 3D
 *                  physics tumble is recorded — never staged/frozen.
 */

export type DemoScene =
  | "roster"
  | "dice"
  | "hero"
  | "advice"
  | "lobby"
  | "roll";

/** Window flag the screenshot script polls once the staged frame is ready. */
const READY_FLAG = "__truffleDemoReady";

declare global {
  interface Window {
    [READY_FLAG]?: boolean;
  }
}

export function markDemoReady() {
  window[READY_FLAG] = true;
}

function readDemoScene(): DemoScene | null {
  if (typeof location === "undefined") return null;
  const value = new URLSearchParams(location.search).get("demo");
  const scenes = ["roster", "dice", "hero", "advice", "lobby", "roll"] as const;
  return (scenes as readonly string[]).includes(value ?? "")
    ? (value as DemoScene)
    : null;
}

/** The active demo scene, or null in the normal app. */
export const demoScene = signal<DemoScene | null>(readDemoScene());

// --- Staged dice layouts ----------------------------------------------------
// World-space coordinates for VirtualDice's camera (looking down the felt from
// (0,10,32) toward (0,0,10)). The floor sits at y = -10 and a die's half-height
// is 0.8, so a die resting flat has its centre at y ≈ -9.2. `value` + `yaw`
// place a flat, readable die; `euler` gives a free tumble for one caught
// mid-air. Tuned by eye against the captured PNGs.

/** In-game throw: a couple settled on the felt, the rest still falling in. */
export const DICE_LAYOUT: StagedDie[] = [
  { x: -2.6, y: -9.2, z: 7.0, value: 5, yaw: 0.35 },
  { x: 1.6, y: -9.2, z: 7.3, value: 2, yaw: -0.5 },
  { x: -2.0, y: -4.4, z: 6.0, euler: [0.6, 0.8, 0.25] },
  { x: 2.3, y: -1.2, z: 5.0, euler: [1.2, 0.4, 1.0] },
  { x: 0.0, y: 2.8, z: 4.2, euler: [0.35, 1.4, 0.7] },
];

// Hero composition: the logo (lifted to ~38% height in DemoHero) is framed by
// dice — one tumbling in above it, two falling through the lower half, two
// landed on the felt. The logo's vertical band is deliberately kept clear.
export const HERO_LAYOUT: StagedDie[] = [
  { x: -2.8, y: -9.2, z: 10.6, value: 3, yaw: 0.4 },
  { x: 2.8, y: -9.2, z: 8.2, value: 6, yaw: -0.3 },
  { x: 2.6, y: -5.2, z: 6.2, euler: [0.8, 0.5, 0.2] },
  { x: -3.4, y: -6.8, z: 5.4, euler: [1.1, 0.9, 0.6] },
  { x: 0.8, y: 5.6, z: 3.4, euler: [0.4, 1.3, 1.1] },
];

// --- Scene setup -------------------------------------------------------------

// A throwaway game history so the roster picker shows a populated grid of past
// players (the autocomplete reads `knownPlayers`, derived from this). Selected
// names come from `rosterDraft`; the extras stay unticked for a natural mix.
function seedKnownPlayers() {
  const names = ["Mara", "Felix", "Jonas", "Lina", "Tom"];
  const record: GameRecord = {
    id: "demo",
    date: 0,
    players: names.map((name, i) => ({
      name,
      human: true,
      scores: Array(13).fill(3),
      bonus: 0,
      total: 200 + i,
      adviceCount: 0,
      longestCombo: 0,
      flawless: false,
      rank: i + 1,
    })),
  };
  games.value = [record];
}

function stageRoster() {
  seedKnownPlayers();
  batch(() => {
    introOpen.value = false;
    // Piggy's tile only shows while the roster is still a one-on-one game, so a
    // three-name draft would render the picker without him. Leave him off and
    // let the shot show the multi-player selection it is meant to show.
    computerPlayer.value = false;
    rosterDraft.value = ["Mara", "Felix", "Jonas"];
  });
  // No 3D scene here, so signal readiness once the layout has painted.
  requestAnimationFrame(() => requestAnimationFrame(markDemoReady));
}

function stageDice() {
  introOpen.value = false;
  // A real two-player game, mid-turn. The 3D dice are staged by the Scene (which
  // reads `demoScene` in Game.tsx); here we just dress the scorecard so the
  // board behind the falling dice looks like a game in progress.
  startGame(["Felix", "Mara"]);
  const felix = players.value[0];
  // A half-filled upper section + a couple of lower categories.
  felix.scores.value = [3, 8, 9, null, 20, null, 22, null, 25, null, null, null, null];
  felix.throwNum.value = 1;
  currentPlayer.value = 0;
  // The Scene marks readiness once the dice are staged.
}

function stageHero() {
  introOpen.value = false;
  // DemoHero renders the logo + a staged Scene; the Scene marks readiness.
}

function stageAdvice() {
  introOpen.value = false;
  computerPlayer.value = false;
  startGame(["Felix", "Mara"]);
  const felix = players.value[0];
  currentPlayer.value = 0;
  // A mid-turn board so the PiggyHint modal sits over a game in progress.
  felix.scores.value = [3, 8, 9, null, 20, null, 22, null, null, null, null, null, null];
  felix.throwNum.value = 2;
  felix.roll.value = [6, 6, 3, 2, 1];
  // Reveal Piggy's suggestion directly (skip the "are you sure?" step); setting
  // piggyKeep is what mounts + fills the PiggyHint. Leave `throwing` at 0 so no
  // live dice tumble behind the modal — the still stays deterministic.
  piggyTips.value = true;
  felix.piggyKeep.value = [6, 6];
  requestAnimationFrame(() => requestAnimationFrame(markDemoReady));
}

function stageLobby() {
  introOpen.value = false;
  // A fixed room id (shape matches makeRoomId: 8 hex chars) so the QR + join
  // link render deterministically — no network is opened, this only dresses the
  // host lobby UI.
  roomId.value = "4f3a9c21";
  lobbyNames.value = { host: "Felix" };
  lobbyMode.value = "host";
  requestAnimationFrame(() => requestAnimationFrame(markDemoReady));
}

function stageRoll() {
  introOpen.value = false;
  computerPlayer.value = false;
  startGame(["Felix", "Mara"]);
  currentPlayer.value = 0;
  // Expose a trigger so scripts/screencast.mjs can fire the throw *on camera* —
  // after the app has painted — instead of auto-rolling during the (blank,
  // ~seconds-long) initial load where the tumble would go unrecorded.
  (window as unknown as { __truffleRoll?: () => void }).__truffleRoll = () =>
    rollDice(true);
  requestAnimationFrame(() => requestAnimationFrame(markDemoReady));
}

/** Apply the active demo scene's staging. A no-op in the normal app. */
export function applyDemo() {
  switch (demoScene.value) {
    case "roster":
      return stageRoster();
    case "dice":
      return stageDice();
    case "hero":
      return stageHero();
    case "advice":
      return stageAdvice();
    case "lobby":
      return stageLobby();
    case "roll":
      return stageRoll();
  }
}
