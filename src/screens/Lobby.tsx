import { ComponentChildren } from "preact";
import { useComputed, useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import { Check, Copy, Loader, X } from "lucide-preact";
import { i18n, roomId } from "../state";
import {
  allSeatsClaimed,
  beginGame,
  cancelLobby,
  claimSeat,
  claimSeatLocal,
  joinGame,
  joinLink,
  lobbyMode,
  lobbyNames,
  myClaim,
  resumeDistributed,
  seats,
} from "../net";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { Pig } from "../components/Pig";
import { TruffleLogo } from "../components/TruffleLogo";
import { QrCode } from "../components/QrCode";
import { Tile, TileBadge } from "../components/Tile";
import { StitchedCard } from "../components/card";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { PlayerName } from "../components/PlayerName";

function Header() {
  return (
    <div class="flex flex-col items-center">
      <Pig class="drop-emboss h-auto w-40 translate-x-2 text-ink" />
      <TruffleLogo class="drop-emboss relative -mt-6 h-auto w-44" />
    </div>
  );
}

// Card chrome shared by the host and guest panels.
function Card({ children }: { children: ComponentChildren }) {
  return (
    <StitchedCard class="flex w-full max-w-sm flex-col items-center gap-5 p-6">
      {children}
    </StitchedCard>
  );
}

function HostLobby() {
  const t = i18n.value;
  const copied = useSignal(false);
  const names = useComputed(() => Object.values(lobbyNames.value));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinLink());
      copied.value = true;
      setTimeout(() => (copied.value = false), 1500);
    } catch {
      /* clipboard blocked — the QR code is the primary path anyway */
    }
  };

  return (
    <Card>
      <p class="text-center text-lg font-semibold text-primary-900">
        {t.scanToJoin}
      </p>
      <QrCode value={joinLink()} class="size-48" />
      <Button intent="soft" onClick={copy}>
        {copied.value ? <Check class="size-4" /> : <Copy class="size-4" />}
        {copied.value ? t.linkCopied : t.copyLink}
      </Button>

      <div class="flex w-full flex-wrap justify-center gap-3 border-t border-primary-200 pt-4">
        {names.value.map((name) => (
          <div key={name} class="flex flex-col items-center gap-1">
            <PlayerAvatar name={name} size="md" />
            <PlayerName name={name} class="max-w-16 truncate" />
          </div>
        ))}
      </div>

      <div class="flex flex-col items-center gap-2">
        <Button
          class="text-lg"
          disabled={names.value.length < 2}
          onClick={beginGame}
        >
          {t.startOnline}
        </Button>
        {names.value.length < 2 && (
          <span class="text-sm text-neutral-500">{t.waitingForPlayers}</span>
        )}
      </div>
    </Card>
  );
}

function GuestLobby() {
  const t = i18n.value;
  const name = useSignal("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Once roomId is set the guest has joined and is waiting for the host's start.
  const joined = roomId.value !== null;

  if (joined) {
    return (
      <Card>
        <Loader class="size-8 animate-spin text-primary-500" />
        <p class="text-center text-lg font-semibold text-primary-900">
          {t.waitingForHost}
        </p>
      </Card>
    );
  }

  const submit = () => {
    const n = name.value.trim();
    if (n) joinGame(n);
  };

  return (
    <Card>
      <p class="text-center text-lg font-semibold text-primary-900">
        {t.joinAs}
      </p>
      <div class="flex w-full items-baseline gap-2 border-b border-neutral-300 px-1 pb-1">
        <span class="text-base font-medium text-neutral-500">Name:</span>
        <input
          ref={inputRef}
          value={name.value}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            name.value = v.charAt(0).toUpperCase() + v.slice(1);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoComplete="off"
          autoFocus
          class="min-w-0 flex-1 bg-transparent font-digits text-2xl leading-none text-ink outline-hidden"
        />
      </div>
      <Button class="text-lg" disabled={!name.value.trim()} onClick={submit}>
        {t.joinButton}
      </Button>
    </Card>
  );
}

// Host side of "split to devices": QR to claim a seat plus the seat list. The
// host taps its own seat; guests claim the rest. Resume once every seat is taken.
function DistributeLobby() {
  const t = i18n.value;
  const list = useComputed(() => seats.value);
  const ready = useComputed(() => allSeatsClaimed());
  const hostPicked = useComputed(() => myClaim.value !== null);

  return (
    <Card>
      <p class="text-center text-lg font-semibold text-primary-900">
        {hostPicked.value ? t.scanToClaim : t.pickYourSeat}
      </p>
      {hostPicked.value && <QrCode value={joinLink(true)} class="size-40" />}

      <div class="flex w-full flex-wrap justify-center gap-3">
        {list.value.map((s) => {
          const mine = myClaim.value === s.index;
          const takeable = !s.claimed && !hostPicked.value;
          const state = mine
            ? "mine"
            : s.claimed
              ? "taken"
              : takeable
                ? "open"
                : "locked";
          return (
            <Tile
              key={s.index}
              state={state}
              disabled={!takeable}
              onClick={() => takeable && claimSeatLocal(s.index)}
              class="gap-1 px-2 py-2"
            >
              <span class="relative">
                <PlayerAvatar name={s.name} size="md" />
                {s.claimed && (
                  <TileBadge tone="claim">
                    <Check class="size-3" strokeWidth={3} />
                  </TileBadge>
                )}
              </span>
              <PlayerName name={s.name} class="max-w-16 truncate" />
              <span class="text-caption leading-none text-neutral-500">
                {mine ? t.seatYou : s.claimed ? t.seatReady : t.seatWaiting}
              </span>
            </Tile>
          );
        })}
      </div>

      <Button
        class="text-lg"
        disabled={!ready.value}
        onClick={resumeDistributed}
      >
        {t.resumeGame}
      </Button>
    </Card>
  );
}

// Guest side of "split to devices": pick which seat (player) this device takes.
function ClaimLobby() {
  const t = i18n.value;
  const list = useComputed(() => seats.value);

  if (myClaim.value !== null) {
    return (
      <Card>
        <Loader class="size-8 animate-spin text-primary-500" />
        <p class="text-center text-lg font-semibold text-primary-900">
          {t.waitingForHost}
        </p>
      </Card>
    );
  }

  if (!list.value.length) {
    return (
      <Card>
        <Loader class="size-8 animate-spin text-primary-500" />
        <p class="text-center text-lg font-semibold text-primary-900">
          {t.connecting}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p class="text-center text-lg font-semibold text-primary-900">
        {t.whoAreYou}
      </p>
      <div class="flex w-full flex-wrap justify-center gap-3">
        {list.value.map((s) => (
          <Tile
            key={s.index}
            state={s.claimed ? "dim" : "open"}
            disabled={s.claimed}
            onClick={() => claimSeat(s.index)}
            class="gap-1 px-2 py-2"
          >
            <PlayerAvatar name={s.name} size="md" />
            <PlayerName name={s.name} class="max-w-16 truncate" />
          </Tile>
        ))}
      </div>
    </Card>
  );
}

export function Lobby() {
  const t = i18n.value;
  const mode = lobbyMode.value;
  const panel =
    mode === "host" ? (
      <HostLobby />
    ) : mode === "distribute" ? (
      <DistributeLobby />
    ) : mode === "claim" ? (
      <ClaimLobby />
    ) : (
      <GuestLobby />
    );
  return (
    <div class="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-5 py-8 text-white">
      {/* Always-visible exit, fixed to the viewport so it can't scroll out of
          reach behind a tall lobby card (matches the close button elsewhere). */}
      <IconButton
        tone="overlay"
        raised
        onClick={cancelLobby}
        aria-label={t.back}
        class="fixed top-4 right-4 z-20"
      >
        <X class="size-5" />
      </IconButton>
      <Header />
      {panel}
    </div>
  );
}
