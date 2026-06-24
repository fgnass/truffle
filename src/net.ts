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
export type Seat = { index: number; name: string; claimed: boolean };
export const seats = signal<Seat[]>([]);
// The seat index this device has claimed (host or guest), null until chosen.
export const myClaim = signal<number | null>(null);

let room: Room | null = null;
let sendSync: ((data: PlayerSync) => void) | null = null;
let sendStart: ((data: PlayerSync[]) => void) | null = null;
let sendHello: ((data: { name: string }) => void) | null = null;
let sendSeats: ((data: Seat[]) => void) | null = null;
let sendClaim: ((data: { index: number }) => void) | null = null;
let isHost = false;
let myName = "";
// "Split to devices" state. `distributing` flags both host and claiming guests;
// `claims` maps each seat index to the peer that owns it (host side).
let distributing = false;
let claims: Record<number, string> = {};
let seatNames: string[] = [];

function makeRoomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
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
  };
}

// Host: recompute the seat list from the captured names + current claims, update
// the local view and push it to everyone.
function publishSeats() {
  const list: Seat[] = seatNames.map((name, index) => ({
    index,
    name,
    claimed: index in claims,
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

  const sync = room.makeAction<PlayerSync>("sync");
  const start = room.makeAction<PlayerSync[]>("start");
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

  sync.onMessage = (data) => applyRemoteSync(data);

  start.onMessage = (roster) => {
    // Guests adopt the host's roster and jump into the game.
    if (!isHost) {
      lobbyMode.value = null;
      startOnlineGame(roster, selfId);
    }
  };

  hello.onMessage = (data, ctx) => {
    if (isHost) {
      lobbyNames.value = { ...lobbyNames.value, [ctx.peerId]: data.name };
    }
  };

  // Guest (claim flow) receives the live seat list to choose from.
  seatList.onMessage = (list) => {
    if (!isHost) seats.value = list;
  };

  // Host (distribute flow) grants a seat to the first peer that claims it.
  claim.onMessage = (data, ctx) => {
    if (isHost && distributing && !(data.index in claims)) {
      claims[data.index] = ctx.peerId;
      publishSeats();
    }
  };

  room.onPeerJoin = () => {
    // Fresh-lobby guest greets the host with its name on connect.
    if (!isHost && !distributing) sendHello?.({ name: myName });
    // Distribute host hands the newcomer the current seat list to pick from.
    if (isHost && distributing) publishSeats();
    // Mid-game, a (re)connecting peer needs our current board right away; their
    // own snapshot will arrive in turn and mark them connected again.
    if (online.value) sendSync?.(localSnapshot());
  };

  room.onPeerLeave = (peerId) => {
    if (online.value) {
      markDisconnected(peerId);
    } else if (isHost && distributing) {
      // Free any seat the departing peer had claimed so it can be retaken.
      for (const [i, owner] of Object.entries(claims)) {
        if (owner === peerId) delete claims[Number(i)];
      }
      publishSeats();
    } else if (isHost) {
      const next = { ...lobbyNames.value };
      delete next[peerId];
      lobbyNames.value = next;
    }
  };
}

function closeRoom() {
  room?.leave().catch(() => {});
  room = null;
  sendSync = sendStart = sendHello = sendSeats = sendClaim = null;
  isHost = false;
  distributing = false;
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
  sendSync?.(snap);
});

// --- Lobby entry points ----------------------------------------------------

export function hostGame(name: string) {
  myName = name;
  isHost = true;
  lobbyMode.value = "host";
  lobbyNames.value = { [selfId]: name };
  roomId.value = makeRoomId();
}

export function enterGuestLobby(rid: string) {
  isHost = false;
  pendingRoom.value = rid;
  lobbyMode.value = "guest";
}

export function joinGame(name: string) {
  const rid = pendingRoom.value;
  if (!rid) return;
  myName = name;
  isHost = false;
  roomId.value = rid; // opens the room; onPeerJoin sends hello
}

// Host freezes the lobby roster and kicks everyone off into the game.
export function beginGame() {
  const roster = Object.entries(lobbyNames.value).map(([id, name]) =>
    freshSync(id, name),
  );
  sendStart?.(roster);
  lobbyMode.value = null;
  startOnlineGame(roster, selfId);
}

// --- "Split to devices": migrate a running local game to P2P ---------------

// Host: open a room offering the current seats. The host claims one seat from
// the UI; guests scan the QR and claim the rest. The local game keeps its state
// untouched until everyone resumes online.
export function distributeGame() {
  isHost = true;
  distributing = true;
  claims = {};
  seatNames = players.value.map((p) => p.name.value ?? "");
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
  isHost = false;
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

// Host: hand the in-progress boards to their claimed devices and resume online.
export function resumeDistributed() {
  const roster: PlayerSync[] = players.value.map((p, i) => ({
    id: claims[i],
    name: p.name.value ?? "",
    scores: p.scores.value,
    combo: p.combo.value,
    longestCombo: p.longestCombo.value,
    flawless: p.flawless.value,
    adviceCount: p.adviceCount.value,
  }));
  sendStart?.(roster);
  distributing = false;
  lobbyMode.value = null;
  startOnlineGame(roster, selfId);
}

// Leave the lobby and return to wherever the device was (clears roomId -> closes
// room). For a distribute host the running local game is left intact underneath.
export function cancelLobby() {
  lobbyMode.value = null;
  pendingRoom.value = null;
  distributing = false;
  claims = {};
  seats.value = [];
  myClaim.value = null;
  roomId.value = null;
  if (location.hash) history.replaceState(null, "", location.pathname);
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
