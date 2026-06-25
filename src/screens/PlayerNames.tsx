import { useComputed, useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import { computerPlayer, i18n, rosterDraft, startGame } from "../state";
import { hostGame } from "../net";
import { knownPlayers } from "../stats";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { PlayerName } from "../components/PlayerName";
import { StartLogo } from "../components/StartLogo";
import { SettingsButton } from "../components/SettingsButton";
import { Tile, TileBadge } from "../components/Tile";
import { StitchedCard } from "../components/card";
import { colorFor, PIGGY_COLOR } from "../components/avatar";
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

  // Starting the game flushes a name still sitting in the input, so a player
  // typed but never added (forgot the + button) isn't silently dropped.
  const roster = isNewName ? [...selected.value, trimmed] : selected.value;

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
    const host =
      trimmed || (selected.value.length === 1 ? selected.value[0] : "");
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
    <div class="relative flex flex-1 flex-col overflow-hidden px-5 py-6 text-white">
      <SettingsButton class="absolute top-4 right-4 z-10" />

      <div class="relative min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div class="flex min-h-full flex-col items-center justify-center gap-5 py-2">
          {/* Piggy stands behind the logo, both white with the same dark outline */}
          <StartLogo />

          <StitchedCard class="flex w-full max-w-sm flex-col gap-4 p-5">
            {/* search + add — mirrors the scorecard field: UI-font label, handwritten
            value (in the dark logo purple here), solid underline */}
            <div class="flex items-center gap-2 px-1">
              <div class="flex min-w-0 flex-1 items-baseline gap-2 border-b border-neutral-300 pb-1">
                <span class="text-base font-medium text-neutral-500">
                  Name:
                </span>
                <input
                  ref={inputRef}
                  value={query.value}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    query.value = v.charAt(0).toUpperCase() + v.slice(1);
                  }}
                  onKeyDown={onKeyDown}
                  autoComplete="off"
                  class="min-w-0 flex-1 bg-transparent font-digits text-2xl leading-none text-ink outline-hidden"
                />
              </div>
              <IconButton
                tone="solid"
                onClick={addNew}
                disabled={!isNewName}
                aria-label={t.newPlayer}
                class="shrink-0"
              >
                <Plus class="size-5" />
              </IconButton>
            </div>

            {/* roster grid */}
            <div class="-m-2 grid max-h-64 grid-cols-3 gap-3 overflow-y-auto p-2">
              {/* Piggy — the computer opponent, always available as a roster member */}
              <Tile
                state={computerPlayer.value ? "on" : "off"}
                onClick={() => (computerPlayer.value = !computerPlayer.value)}
                style={{
                  backgroundColor: `color-mix(in srgb, ${PIGGY_COLOR} 18%, white)`,
                }}
                class={TILE_LAYOUT}
              >
                <PlayerAvatar
                  name="Piggy"
                  piggy
                  size="lg"
                  class={computerPlayer.value ? "avatar-pop" : ""}
                />
                <PlayerName name="Piggy" piggy size="md" />
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
                    <PlayerAvatar
                      name={name}
                      size="lg"
                      class={on ? "avatar-pop" : ""}
                    />
                    <PlayerName name={name} size="md" class="max-w-full truncate" />
                    {on && (
                      <TileBadge tone="select">
                        <Check class="size-3.5" strokeWidth={3} />
                      </TileBadge>
                    )}
                  </Tile>
                );
              })}

              {/* new player */}
              <Tile
                state="add"
                onClick={() =>
                  isNewName ? addNew() : inputRef.current?.focus()
                }
                class={TILE_LAYOUT}
              >
                <Plus class="size-7" />
                <span class="max-w-full truncate text-sm font-semibold">
                  {isNewName ? trimmed : t.newPlayer}
                </span>
              </Tile>
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
                disabled={roster.length < 1}
                onClick={() => startGame(roster)}
              >
                {t.letsGo}
              </Button>
            </div>
          </StitchedCard>
        </div>
      </div>
    </div>
  );
}
