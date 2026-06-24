import { useComputed, useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import { computerPlayer, i18n, rosterDraft, startGame } from "../state";
import { hostGame } from "../net";
import { knownPlayers } from "../stats";
import { Button } from "../components/Button";
import { PigAvatar } from "../components/PigAvatar";
import { StartLogo } from "../components/StartLogo";
import { SettingsButton } from "../components/SettingsButton";
import { Tile, TileBadge } from "../components/Tile";
import { stitchedCard } from "../components/card";
import {
  avatarFor,
  colorFor,
  featureColor,
  PIGGY_COLOR,
} from "../components/avatar";
import { Check, Plus, Smartphone } from "lucide-preact";

// Layout shared by every roster tile (the picker sizes them the same; selection
// styling lives in the Tile primitive's `state` variant).
const TILE_LAYOUT = "gap-1.5 px-1 py-3 active:scale-95";

export function PlayerNames() {
  const t = i18n.value;
  // Seed from any carried-over party ("play again"); empty for a fresh game.
  const selected = useSignal<string[]>(rosterDraft.value);
  const query = useSignal("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Known players (from past games) plus any freshly added ones, in a stable
  // order so the colour assignment doesn't shuffle as the selection changes.
  const allNames = useComputed(() => [
    ...knownPlayers.value,
    ...selected.value.filter((n) => !knownPlayers.value.includes(n)),
  ]);

  const tiles = useComputed(() => {
    const q = query.value.trim().toLowerCase();
    return q
      ? allNames.value.filter((n) => n.toLowerCase().includes(q))
      : allNames.value;
  });

  const trimmed = query.value.trim();
  const isNewName =
    !!trimmed &&
    !allNames.value.some((n) => n.toLowerCase() === trimmed.toLowerCase());

  const toggle = (name: string) => {
    selected.value = selected.value.includes(name)
      ? selected.value.filter((n) => n !== name)
      : [...selected.value, name];
  };

  const addNew = () => {
    if (!isNewName) return;
    selected.value = [...selected.value, trimmed];
    query.value = "";
  };

  // Host an online game under the host's own name: the typed name wins,
  // otherwise a single picked player, otherwise nudge the user to type one.
  const startOnline = () => {
    const host = trimmed || (selected.value.length === 1 ? selected.value[0] : "");
    if (host) hostGame(host);
    else inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (isNewName) {
      addNew();
    } else if (tiles.value.length) {
      toggle(tiles.value[0]);
      query.value = "";
    }
  };

  return (
    <div class="relative flex-1 flex flex-col overflow-hidden px-5 py-6 text-white">
      <SettingsButton class="absolute right-4 top-4 z-10" />

      <div class="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex min-h-full flex-col items-center justify-center gap-5 py-2">
          {/* Piggy stands behind the logo, both white with the same dark outline */}
          <StartLogo />

          <div class={`w-full max-w-sm p-5 text-ink flex flex-col gap-4 ${stitchedCard}`}>
        {/* search + add — mirrors the scorecard field: UI-font label, handwritten
            value (in the dark logo purple here), solid underline */}
        <div class="flex items-center gap-2 px-1">
          <div class="flex min-w-0 flex-1 items-baseline gap-2 border-b border-neutral-300 pb-1">
            <span class="text-base font-medium text-neutral-500">Name:</span>
            <input
              ref={inputRef}
              value={query.value}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                query.value = v.charAt(0).toUpperCase() + v.slice(1);
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              class="font-digits min-w-0 flex-1 bg-transparent text-2xl leading-none text-ink outline-hidden"
            />
          </div>
          <button
            onClick={addNew}
            disabled={!isNewName}
            aria-label={t.newPlayer}
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white transition active:scale-90 disabled:opacity-30"
          >
            <Plus class="size-5" />
          </button>
        </div>

        {/* roster grid */}
        <div class="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto -m-2 p-2">
          {/* Piggy — the computer opponent, always available as a roster member */}
          <Tile
            state={computerPlayer.value ? "on" : "off"}
            onClick={() => (computerPlayer.value = !computerPlayer.value)}
            style={{
              backgroundColor: `color-mix(in srgb, ${PIGGY_COLOR} 18%, white)`,
            }}
            class={TILE_LAYOUT}
          >
            <PigAvatar
              class={`size-12 rounded-full ${
                computerPlayer.value ? "avatar-pop" : ""
              }`}
            />
            <span
              style={{ color: `color-mix(in srgb, ${PIGGY_COLOR} 50%, black)` }}
              class="font-logo text-base leading-none"
            >
              Piggy
            </span>
            {computerPlayer.value && (
              <TileBadge tone="select">
                <Check class="size-3.5" strokeWidth={3} />
              </TileBadge>
            )}
          </Tile>

          {tiles.value.map((name) => {
            const on = selected.value.includes(name);
            return (
              <Tile
                key={name}
                state={on ? "on" : "off"}
                onClick={() => toggle(name)}
                style={{
                  color: colorFor(name),
                  backgroundColor: `color-mix(in srgb, ${colorFor(name)} 18%, white)`,
                }}
                class={TILE_LAYOUT}
              >
                <img
                  src={avatarFor(name)}
                  alt=""
                  class={`size-12 rounded-full ${on ? "avatar-pop" : ""}`}
                />
                <span
                  style={{ color: featureColor(name) }}
                  class="max-w-full truncate font-logo text-base leading-none"
                >
                  {name}
                </span>
                {on && (
                  <TileBadge tone="select">
                    <Check class="size-3.5" strokeWidth={3} />
                  </TileBadge>
                )}
              </Tile>
            );
          })}

          {/* new player */}
          <button
            onClick={() =>
              isNewName ? addNew() : inputRef.current?.focus()
            }
            class="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary-300 px-1 py-3 text-primary-700 transition active:scale-95"
          >
            <Plus class="size-7" />
            <span class="max-w-full truncate text-sm font-semibold">
              {isNewName ? trimmed : t.newPlayer}
            </span>
          </button>
        </div>

        <div class="flex items-center justify-between gap-2">
          <Button
            intent="ghost"
            onClick={startOnline}
            class="gap-1.5 px-3 py-2 text-sm font-semibold text-primary-700"
          >
            <Smartphone class="size-4" />
            {t.playOnline}
          </Button>
          <Button
            class="text-lg"
            disabled={selected.value.length < 1}
            onClick={() => startGame(selected.value)}
          >
            {t.letsGo}
          </Button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
