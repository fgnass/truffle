import { computed, useSignalEffect } from "@preact/signals";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Game } from "./screens/Game";
import { gameFinished, introOpen, showStats, started } from "./state";
import { lobbyMode } from "./net";
import { PlayerNames } from "./screens/PlayerNames";
import { Lobby } from "./screens/Lobby";
import { LeaderBoard } from "./screens/LeaderBoard";
import { Stats } from "./screens/Stats";
import { Intro } from "./screens/Intro";
import { Settings } from "./components/Settings";
import { InstallPrompt } from "./components/InstallPrompt";

const screens = {
  names: PlayerNames,
  lobby: Lobby,
  leaderboard: LeaderBoard,
  game: Game,
  stats: Stats,
  intro: Intro,
} as const;

type ScreenKey = keyof typeof screens;

const screen = computed<ScreenKey>(() => {
  // The first-run tour takes over the whole screen until skipped/finished —
  // both at launch and when replayed from settings.
  if (introOpen.value) return "intro";
  // Stats overlays any screen; closing it falls back to the underlying state.
  if (showStats.value) return "stats";
  // Hosting/joining an online game sits in the lobby until the host starts.
  if (lobbyMode.value) return "lobby";
  // The app opens on the player picker; a game flips `started`.
  if (!started.value) return "names";
  if (gameFinished.value) return "leaderboard";
  return "game";
});

export function App() {
  const [current, setCurrent] = useState<ScreenKey>(() => screen.value);
  const currentRef = useRef(current);
  const resolve = useRef<(() => void) | undefined>(undefined);

  // Once the new screen is committed to the DOM, let the view transition
  // capture it and start animating.
  useLayoutEffect(() => {
    currentRef.current = current;
    resolve.current?.();
    resolve.current = undefined;
  }, [current]);

  useSignalEffect(() => {
    const next = screen.value;
    if (next === currentRef.current) return;

    const doc = document as Document & {
      startViewTransition?: (cb: () => Promise<void>) => unknown;
    };
    if (!doc.startViewTransition) {
      setCurrent(next);
      return;
    }
    // Keep the old screen in the DOM until the transition snapshots it, then
    // swap to the new one and resolve once Preact has committed it.
    doc.startViewTransition(
      () =>
        new Promise<void>((r) => {
          resolve.current = r;
          setCurrent(next);
        }),
    );
  });

  const Screen = screens[current];
  return (
    <>
      <Screen />
      <Settings />
      <InstallPrompt />
    </>
  );
}
