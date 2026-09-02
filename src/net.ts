import { effect, signal } from "@preact/signals";
import { joinRoom, selfId, type Room } from "trystero/nostr";
import {
  applyRemoteSync,
  localSnapshot,
  markDisconnected,
  online,
  players,
  roomId,
  startOnlineGame,
  type PlayerSync,
} from "./state";

// Trystero groups peers by appId + roomId. The appId namespaces Truffle on the
// shared public Nostr relays it uses for signalling; only the room id is shared
// via QR. Once peers connect, game data flows directly P2P, never via a relay.
const APP_ID = "truffle-dice";

// Which lobby the local device is sitting in (null = not in a lobby). Drives the
// Lobby screen; cleared once the game actually starts.
//   host       — opened a fresh online game, waiting for guests
//   guest      — joined a fresh game, entering name / waiting for host
//   distribute — splitting a running local game onto devices (host side)
//   claim      — joined a game-in-progress, picking which seat to take
export const lobbyMode = signal<
  null | "host" | "guest" | "distribute" | "claim"
>(null);
// A guest's room id parsed from the join link, used by the guest name form.
export const pendingRoom = signal<string | null>(null);
// The host's view of the roster (peerId -> name), including the host itself.
// Updated as guests announce themselves; frozen into the seat order on start.
export const lobbyNames = signal<Record<string, string>>({});
// "Split to devices": the existing seats and whether each has been claimed by a
// device. Maintained by the host and pushed to every claiming guest.
// `by` is the peer id that holds the seat, so a claiming device can tell "mine"
// from "someone else got there first" — `claimed` alone can't distinguish them.
export type Seat = {
  index: number;
  name: string;
  claimed: boolean;
  by?: string;
};
export const seats = signal<Seat[]>([]);
// The seat index this device has claimed (host or guest), null until chosen.
export const myClaim = signal<number | null>(null);
// True on the device that opened the room. Survives the whole online session
// (the room stays open across rematches), so the leaderboard can offer "play
// again" to the host and a "waiting for the host" note to everyone else.
export const isRoomHost = signal(false);
// Set when a device opens a claim link for a split that has already finished —
// the seat-picker has nothing to offer, so the lobby says so instead of spinning.
export const claimClosed = signal(false);
// True while the "distribute" lobby is staging a game that hasn't started yet
// (split from the player picker) rather than one already in progress. Only the
// wording differs — "let's go" vs. "resume on the devices".
export const stagingGame = signal(false);

let room: Room | null = null;
type StartMsg = { epoch: number; roster: PlayerSync[] };
type SyncMsg = { epoch: number; player: PlayerSync };

let sendSync: ((data: SyncMsg) => void) | null = null;
let sendStart: ((data: StartMsg) => void) | null = null;
let sendHello: ((data: { name: string }) => void) | null = null;
let sendSeats: ((data: Seat[]) => void) | null = null;
let sendClaim: ((data: { index: number }) => void) | null = null;
let myName = "";
// "Split to devices" state. `distributing` flags both host and claiming guests;
// `claims` maps each seat index to the peer that owns it (host side).
let distributing = false;
let claims: Record<number, string> = {};
let seatNames: string[] = [];
// Set when the split was started from the player picker rather than a running
// game: the roster to open a *fresh* game with, instead of handing over boards.
let pendingRoster: string[] | null = null;
// Which game generation this device is playing. Bumped by every `start` the host
// sends (the initial kickoff and each rematch) and carried on every sync, so a
// snapshot still in flight from the game that just ended can't leak into the new
// one — without it a stale full score sheet would land in a fresh seat and the
// round barrier would deadlock on a player who looks finished already.
let epoch = 0;

function makeRoomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

// The name this device plays under online, remembered across sessions so a
// player joining game after game doesn't retype it every time. Written whenever
// a name is actually used to host or join.
const NAME_KEY = "truffle.myName";

export function rememberedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return ""; // private mode / storage blocked — just start empty
  }
}

// Collapse inner runs of whitespace and strip the ends, so "  Elmer " and
// "Elmer" are the same player rather than two look-alike entries in the roster
// and the high-score table.
function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function setMyName(name: string) {
  myName = normalizeName(name);
  try {
    if (myName) localStorage.setItem(NAME_KEY, myName);
  } catch {
    /* storage blocked — the name just won't be remembered */
  }
  return myName;
}

function freshSync(id: string, name: string): PlayerSync {
  return {
    id,
    name,
    scores: Array(13).fill(null),
    combo: 0,
    longestCombo: 0,
    flawless: true,
    adviceCount: 0,
    truffles: 0,
  };
}

// Host: recompute the seat list from the captured names + current claims, update
// the local view and push it to everyone.
function publishSeats() {
  const list: Seat[] = seatNames.map((name, index) => ({
    index,
    name,
    claimed: index in claims,
    by: claims[index],
  }));
  seats.value = list;
  sendSeats?.(list);
}

// Open the room for the current roomId and wire the three actions:
//  hello — guest announces its name to the host (lobby)
//  start — host broadcasts the frozen roster (lobby -> game)
//  sync  — everyone broadcasts their own board snapshot (in game)
function openRoom(rid: string) {
  room = joinRoom({ appId: APP_ID }, rid);

  const sync = room.makeAction<SyncMsg>("sync");
  const start = room.makeAction<StartMsg>("start");
  const hello = room.makeAction<{ name: string }>("hello");
  const seatList = room.makeAction<Seat[]>("seats");
  const claim = room.makeAction<{ index: number }>("claim");
  // Broadcasts are best-effort: a send to a peer that just dropped rejects, and
  // an unhandled rejection would surface as an error. Swallow them at the source.
  sendSync = (d) => void sync.send(d).catch(() => {});
  sendStart = (d) => void start.send(d).catch(() => {});
  sendHello = (d) => void hello.send(d).catch(() => {});
  sendSeats = (d) => void seatList.send(d).catch(() => {});
  sendClaim = (d) => void claim.send(d).catch(() => {});

  // Drop anything from a game that has already been superseded — see `epoch`.
  sync.onMessage = (data) => {
    if (data.epoch === epoch) applyRemoteSync(data.player);
  };

  start.onMessage = (msg) => {
    // Guests adopt the host's roster and jump into the game — the initial
    // kickoff and every later rematch arrive the same way.
    if (isRoomHost.value) return;
    epoch = msg.epoch;
    lobbyMode.value = null;
    clearJoinHash();
    startOnlineGame(msg.roster, selfId);
  };

  hello.onMessage = (data, ctx) => {
    if (!isRoomHost.value) return;
    // A peer's name arrives as raw input; normalize it here so the roster the
    // host freezes (and every score sheet derived from it) is already clean.
    const name = normalizeName(data.name ?? "");
    if (!name) return;
    lobbyNames.value = { ...lobbyNames.value, [ctx.peerId]: name };
  };

  // Guest (claim flow) receives the live seat list to choose from. An empty list
  // means the host has already resumed and there is nothing left to claim.
  seatList.onMessage = (list) => {
    if (isRoomHost.value) return;
    seats.value = list;
    if (!list.length && lobbyMode.value === "claim") {
      claimClosed.value = true;
      return;
    }
    // The host's list is the authority on who owns what. A claim is optimistic
    // locally, so if two devices raced for the same seat the loser must be told:
    // drop the claim and let them pick again from whatever is still open.
    const mine = list.find((s) => s.index === myClaim.value);
    if (myClaim.value !== null && mine?.claimed && mine.by !== selfId) {
      myClaim.value = null;
    }
  };

  // Host (distribute flow) grants a seat to the first peer that claims it.
  claim.onMessage = (data, ctx) => {
    if (isRoomHost.value && distributing && !(data.index in claims)) {
      claims[data.index] = ctx.peerId;
      publishSeats();
    }
  };

  room.onPeerJoin = () => {
    // Fresh-lobby guest greets the host with its name on connect.
    if (!isRoomHost.value && !distributing) sendHello?.({ name: myName });
    // Distribute host hands the newcomer the current seat list to pick from.
    if (isRoomHost.value && distributing) publishSeats();
    // A device that arrives in the seat-picker after the split is over (a stale
    // claim link, or the back button) would otherwise wait forever for a seat
    // list that is never coming. Tell it the split is done so it can say so.
    if (isRoomHost.value && !distributing && online.value) sendSeats?.([]);
    // Mid-game, a (re)connecting peer needs our current board right away; their
    // own snapshot will arrive in turn and mark them connected again.
    if (online.value) sendSync?.({ epoch, player: localSnapshot() });
  };

  room.onPeerLeave = (peerId) => {
    if (online.value) {
      markDisconnected(peerId);
    } else if (isRoomHost.value && distributing) {
      // Free any seat the departing peer had claimed so it can be retaken.
      for (const [i, owner] of Object.entries(claims)) {
        if (owner === peerId) delete claims[Number(i)];
      }
      publishSeats();
    } else if (isRoomHost.value) {
      const next = { ...lobbyNames.value };
      delete next[peerId];
      lobbyNames.value = next;
    }
  };
}

// Drop the #room=… marker from the address bar. The link has done its job the
// moment the device is in the room; leaving it there means any later reload
// (a PWA relaunch, a service-worker update, iOS reclaiming memory) re-runs
// initFromUrl and throws the player back into the join/claim lobby — out of the
// game they were in the middle of, and stuck waiting for a seat list the host
// no longer sends because it has stopped distributing.
function clearJoinHash() {
  if (location.hash) history.replaceState(null, "", location.pathname);
}

function closeRoom() {
  room?.leave().catch(() => {});
  room = null;
  sendSync = sendStart = sendHello = sendSeats = sendClaim = null;
  isRoomHost.value = false;
  distributing = false;
  pendingRoster = null;
  stagingGame.value = false;
  epoch = 0;
  claims = {};
  lobbyNames.value = {};
}

// roomId is the single source of truth for "should a room exist". Hosting/joining
// sets it; newGame() clears it. The room is kept open through the whole game for
// score sync and only torn down when roomId goes null.
effect(() => {
  const rid = roomId.value;
  if (rid && !room) openRoom(rid);
  else if (!rid && room) closeRoom();
});

// Broadcast the local player's board on every change once the game is live.
// localSnapshot() reads the local player's signals, so this re-runs whenever the
// score sheet (or a badge tally) changes — an idempotent, last-writer-wins push.
effect(() => {
  if (!online.value) return;
  const snap = localSnapshot();
  sendSync?.({ epoch, player: snap });
});

// --- Lobby entry points ----------------------------------------------------

export function hostGame(name: string) {
  const n = setMyName(name);
  isRoomHost.value = true;
  lobbyMode.value = "host";
  lobbyNames.value = { [selfId]: n };
  roomId.value = makeRoomId();
}

export function enterGuestLobby(rid: string) {
  isRoomHost.value = false;
  pendingRoom.value = rid;
  lobbyMode.value = "guest";
}

export function joinGame(name: string) {
  const rid = pendingRoom.value;
  if (!rid) return;
  if (!setMyName(name)) return; // whitespace-only — nothing to join as
  isRoomHost.value = false;
  roomId.value = rid; // opens the room; onPeerJoin sends hello
}

// Host freezes the lobby roster and kicks everyone off into the game.
export function beginGame() {
  const roster = Object.entries(lobbyNames.value).map(([id, name]) =>
    freshSync(id, name),
  );
  epoch++;
  sendStart?.({ epoch, roster });
  lobbyMode.value = null;
  startOnlineGame(roster, selfId);
}

// Host: start another round with exactly the party that just finished, without
// tearing anything down. The room, the peer connections and every seat's peer id
// stay as they are — only the score sheets are wiped. That's the whole point:
// after a finished online game nobody has to scan a QR code again.
//
// It rides on the same `start` action as the initial kickoff, so guests need no
// new handler: they simply adopt the roster and jump into a fresh game. Because
// the ids are the peers' existing ones, each device lands back in its own seat.
export function rematch() {
  // A peer that dropped out during the game keeps its seat on the leaderboard,
  // but taking it into the next game would stall the round barrier on a device
  // that isn't there. Drop those seats; the player can rejoin via the same link,
  // which still works — the room id hasn't changed.
  const roster = players.value
    .filter((p) => p.connected.value)
    .map((p) => freshSync(p.id, p.name.value ?? ""));
  if (roster.length < 2) return;
  epoch++;
  sendStart?.({ epoch, roster });
  startOnlineGame(roster, selfId);
}

// --- "Split to devices": migrate a running local game to P2P ---------------

// Host: open a room offering a set of seats. The host claims one seat from the
// UI; guests scan the QR and claim the rest.
//
// Two callers, one flow. Mid-game (from the settings sheet) `names` is omitted
// and the seats come from the running game, whose state stays untouched until
// everyone resumes online. From the player picker `names` is the roster the host
// just assembled and there is no game yet — `pendingRoster` remembers it so
// resumeDistributed() can start a fresh game instead of handing over boards.
export function distributeGame(names?: string[]) {
  isRoomHost.value = true;
  distributing = true;
  claims = {};
  pendingRoster = names ?? null;
  stagingGame.value = !!names;
  seatNames = names ?? players.value.map((p) => p.name.value ?? "");
  seats.value = seatNames.map((name, index) => ({
    index,
    name,
    claimed: false,
  }));
  lobbyMode.value = "distribute";
  roomId.value = makeRoomId(); // opens the room
}

// Host claims one of the seats for this device.
export function claimSeatLocal(index: number) {
  if (!(index in claims)) {
    claims[index] = selfId;
    myClaim.value = index;
    publishSeats();
  }
}

// Guest (claim flow) opens the room immediately to receive the seat list.
export function enterClaimLobby(rid: string) {
  isRoomHost.value = false;
  claimClosed.value = false;
  distributing = true;
  lobbyMode.value = "claim";
  roomId.value = rid;
}

// Guest asks the host for a seat (first claim wins, optimistic locally).
export function claimSeat(index: number) {
  myClaim.value = index;
  sendClaim?.({ index });
}

export function allSeatsClaimed() {
  return seats.value.length > 0 && seats.value.every((s) => s.claimed);
}

// Host: hand the seats to their claimed devices and start playing online.
// A split from the player picker opens a fresh game (empty sheets); a split from
// a running game carries each player's board over so nobody loses their score.
export function resumeDistributed() {
  const roster: PlayerSync[] = pendingRoster
    ? pendingRoster.map((name, i) => freshSync(claims[i], name))
    : players.value.map((p, i) => ({
        id: claims[i],
        name: p.name.value ?? "",
        scores: p.scores.value,
        combo: p.combo.value,
        longestCombo: p.longestCombo.value,
        flawless: p.flawless.value,
        adviceCount: p.adviceCount.value,
        truffles: p.truffles.value,
      }));
  epoch++;
  sendStart?.({ epoch, roster });
  distributing = false;
  pendingRoster = null;
  stagingGame.value = false;
  lobbyMode.value = null;
  startOnlineGame(roster, selfId);
}

// Leave the lobby and return to wherever the device was (clears roomId -> closes
// room). For a distribute host the running local game is left intact underneath.
export function cancelLobby() {
  lobbyMode.value = null;
  claimClosed.value = false;
  pendingRoom.value = null;
  distributing = false;
  pendingRoster = null;
  stagingGame.value = false;
  claims = {};
  seats.value = [];
  myClaim.value = null;
  roomId.value = null;
  clearJoinHash();
}

// The shareable join link for the current room. `claim` marks a link that drops
// the guest into the seat-picker for a game already in progress.
export function joinLink(claim = false) {
  return `${location.origin}${location.pathname}#room=${roomId.value}${
    claim ? "&claim=1" : ""
  }`;
}

// On load, a #room=<id> link opens the join form; the &claim marker opens the
// seat-picker for a game being split onto devices.
export function initFromUrl() {
  const m = location.hash.match(/room=([a-z0-9]+)/i);
  if (!m) return;
  if (/claim/i.test(location.hash)) enterClaimLobby(m[1]);
  else enterGuestLobby(m[1]);
}
