import { batch, computed, effect, signal } from "@preact/signals";
import _ from "lodash";

import * as translations from "./i18n";
import { dataReady, getAdvice, getCategoryScore, rollsMatch } from "./strategy";
import { recordGame, rankPlayers, type GameRecord } from "./stats";

// True once a game has been started (a roster is built). The app opens on the
// player picker; starting a game flips this, cancelling/finishing it back.
export const started = signal(false);
// Overlays the stats screen on top of whatever screen is active. `statsRoster`
// optionally scopes it to a set of players ("this round"); empty = all-time.
export const showStats = signal(false);
export const statsRoster = signal<string[]>([]);

// Names to pre-tick in the roster picker when it next opens. Set by "play again"
// at the end of a game so the party carries over (the player can still tweak it);
// cleared by a plain "new game".
export const rosterDraft = signal<string[]>([]);

export function openStats(roster: string[] = []) {
  batch(() => {
    statsRoster.value = roster;
    showStats.value = true;
    // Stats is reached from the settings sheet; dismiss it so it doesn't overlay.
    settingsOpen.value = false;
  });
}

export function closeStats() {
  showStats.value = false;
}

// The always-available settings sheet (toggles, share, cancel game).
export const settingsOpen = signal(false);

// First-run guided tour. `truffle.seenIntro` persists the fact that it ran;
// `introOpen` drives the carousel modal and starts open the very first time so
// new players meet Piggy before anything else. It can be replayed from the
// settings sheet. Skipping or finishing both mark it seen.
export const introOpen = signal(
  localStorage.getItem("truffle.seenIntro") !== "1",
);
export function openIntro() {
  settingsOpen.value = false;
  introOpen.value = true;
}
export function closeIntro() {
  introOpen.value = false;
  localStorage.setItem("truffle.seenIntro", "1");
}

export const computerPlayer = signal(false);

// When enabled, a suboptimal category entry immediately offers Piggy's better
// move ("use it" / "keep mine") instead of first asking whether to reveal it.
// Persisted across sessions.
export const piggyTips = signal(
  localStorage.getItem("truffle.piggyTips") === "1",
);
effect(() => {
  localStorage.setItem("truffle.piggyTips", piggyTips.value ? "1" : "0");
});

// Master switch for the "that wasn't Piggy's best move" coaching hint. Default
// on; when off, the hint/modal never appears (combo/flawless tracking is kept).
export const piggyHints = signal(
  localStorage.getItem("truffle.piggyHints") !== "0",
);
effect(() => {
  localStorage.setItem("truffle.piggyHints", piggyHints.value ? "1" : "0");
});

// Dice-impact sound effects. Persisted across sessions; default on. Read by
// diceSound.play(), which falls silent while this is off.
export const sound = signal(localStorage.getItem("truffle.sound") !== "0");
effect(() => {
  localStorage.setItem("truffle.sound", sound.value ? "1" : "0");
});
export const throwing = signal(0);
// True while the dice are in the cup waiting to be shaken/thrown — drives the
// on-screen shake instructions.
export const shaking = signal(false);
// True once the player has actually started shaking the cup. The dice drop when
// the cup goes still, so the hint flips from "start moving" to "stop to throw".
export const shakingActive = signal(false);
// True after the dice have landed but not all lie flat, and the player isn't
// currently wiggling — prompts them to shake the table to settle the stragglers.
export const nudging = signal(false);
// True once we've confirmed a usable motion sensor (permission granted *and* a
// real reading arrived). Stays false on desktops and on touch devices that deny
// the permission — those throw by swiping/clicking instead of shaking. Drives
// which throw instructions we show; see requestMotionPermission().
export const motionAvailable = signal(false);
export const digging = signal(0);
export const currentPlayer = signal(0);

// --- Online (P2P) mode -----------------------------------------------------
// True once an online game has been started via net.ts. In this mode every
// device drives only its own player (`localPlayer`); the others are read-only
// replicas fed by incoming sync snapshots. See net.ts for the transport.
export const online = signal(false);
// The room id shared via QR; null until a host/guest session is created.
export const roomId = signal<string | null>(null);
// Index into `players` of the player this device controls.
export const localPlayer = signal(0);

// The snapshot one device broadcasts about its own player. Kept tiny — only the
// score sheet plus the badge tallies the leaderboard needs (live dice activity
// stays local). Everything here is plain JSON so it can cross the wire.
export type PlayerSync = {
  id: string;
  name: string;
  scores: Array<number | null>;
  combo: number;
  longestCombo: number;
  flawless: boolean;
  adviceCount: number;
};

const preferredLang = Object.keys(translations).find((l) =>
  navigator.language.toLowerCase().includes(l),
);

export const lang = signal(preferredLang ?? "en");

export const i18n = computed(
  () => translations[lang.value as keyof typeof translations],
);

export const gameFinished = computed(() =>
  // Online, a dropped peer's board may stay unfinished — don't let it wedge the
  // game open. Offline every player is "connected", so this is the same check.
  players.value.every((p) => !p.connected.value || !!p.scoreboardFull.value),
);

export const finalRanking = computed(() => {
  if (!gameFinished.value) return [];
  const ranked = [...players.value];
  ranked.sort((a, b) => b.totalScore.value - a.totalScore.value);
  return ranked;
});

function sum(a: number | null, b: number | null) {
  return (a ?? 0) + (b ?? 0);
}

export class PlayerState {
  human = true;
  // Stable peer id in online games (empty offline). Identifies which device a
  // remote player belongs to so incoming sync snapshots land on the right seat.
  id = "";
  // Online only: false once this player's peer drops, so the round barrier and
  // game-finished check can ignore them instead of waiting forever.
  connected = signal(true);
  name = signal<string | null>(null);
  throwNum = signal(0);
  throwing = signal(0);
  // Drives the "Perfekt!"/"Nice" celebration. Set both on a perfect dice pick
  // (an optimal keep-and-reroll) and when a round is completed flawlessly.
  perfect = signal(false);
  // True only when `perfect` celebrates a *completed* round (set in assignScore,
  // cleared on the next throw). Gates the "Combo ×N" badge so the multiplier
  // shows at round end only — never on a mid-round perfect pick.
  roundComplete = signal(false);
  // Streak of consecutive perfect rounds. A round counts only if every dice
  // pick and the final category pick were Piggy-optimal (and Piggy wasn't
  // asked). Tallied once per round on the category entry.
  combo = signal(0);
  // Whether the round currently in progress is still flawless. Reset to true at
  // the start of each round; cleared by any suboptimal pick or asking Piggy.
  roundPerfect = signal(true);
  // True until the player's first non-optimal move (or leaning on Piggy — asking,
  // adopting, or even just seeing a hint) this game. Survives player switches;
  // decides whether a perfect move shows "Perfekt!" (flawless) or just the lesser
  // "Nice" badge.
  flawless = signal(true);
  // Category Piggy would have picked when the player entered a suboptimal score
  // without asking. Drives the "that wasn't Piggy's best move" hint; null hides it.
  piggyPick = signal<number | null>(null);
  // Dice Piggy would have kept when the player is about to re-roll a suboptimal
  // selection. Set proactively (before the throw), drives the same hint modal.
  piggyKeep = signal<number[] | null>(null);
  // True once Piggy's recommendation has been shown during the current round (the
  // keep hint). It outlives the player's decision — undoing and hand-picking
  // Piggy's move can't clear it — so a round in which the player peeked earns no
  // celebration badge, even if they end up making the optimal move. Reset at the
  // start of each round. Seeing the hint also drops the game-wide `flawless` flag,
  // downgrading later perfect rounds to the lesser "Nice" badge (never silencing
  // them).
  piggySeen = signal(false);
  // Picks the wording of the celebration badge for the move it currently
  // accompanies: true → "Perfekt!" (the turn was flawless up to this move),
  // false → "Stark" (the player deviated earlier this turn but is now back on
  // Piggy's line). Captured at the instant `perfect` is set — it can't be read
  // live from `roundPerfect`, which is reset to true the moment a round ends.
  // Distinct from the game-wide `flawless` (leaderboard "Makellos!") on purpose.
  badgeFlawless = signal(true);
  roll = signal<number[]>([]);
  selection = signal<boolean[]>(Array(5).fill(false));
  scores = signal<Array<number | null>>(Array(13).fill(null));

  adviceNeeded = signal(false);

  // Cumulative per-game tallies for the post-game stats: how often the player
  // asked Piggy, and the best combo streak reached. `combo` itself resets on a
  // misstep or player switch, so we track its high-water mark separately.
  adviceCount = signal(0);
  longestCombo = signal(0);

  upperScore = computed(() => this.scores.value.slice(0, 6).reduce(sum));

  lowerScore = computed(() => this.scores.value.slice(6).reduce(sum));

  scoreboardFull = computed(() => {
    //return this.scores.value.filter((s) => s !== null).length > 0;
    return this.scores.value.every((s) => s !== null);
  });

  upperSectionFull = computed(() =>
    this.scores.value.slice(0, 6).every((s) => s !== null),
  );

  bonus = computed(() =>
    this.upperSectionFull.value
      ? (this.upperScore.value ?? 0) >= 63
        ? 35
        : 0
      : null,
  );

  totalScore = computed(() => {
    return (
      (this.upperScore.value ?? 0) +
      (this.bonus.value ?? 0) +
      (this.lowerScore.value ?? 0)
    );
  });

  advice = computed<null | string | number | number[]>(() => {
    // The strategy tables aren't loaded yet — any advice would be read off a
    // zero-filled table, so withhold it (no garbage hints / computer picks).
    if (!dataReady.value) return null;
    const active = this.throwNum.value > 0 && this.throwNum.value <= 3;
    if (this.roll.value.length !== 5 || !active) return null;
    const scores = this.scores.value.map((s) => s ?? -1);
    const a = getAdvice(scores, this.throwNum.value, this.roll.value);
    if (a instanceof Array && a.length === 5 && this.throwNum.value < 3) {
      return getAdvice(scores, 3, this.roll.value);
    }
    return a;
  });

  constructor() {
    // Track the best combo streak reached this game (combo resets on a misstep
    // or player switch, so its peak has to be captured as it happens).
    effect(() => {
      if (this.combo.value > this.longestCombo.value) {
        this.longestCombo.value = this.combo.value;
      }
    });

    // Count each time the human asks Piggy for advice (false -> true edge). The
    // computer player flips adviceNeeded every move, so it's excluded.
    let askedBefore = false;
    effect(() => {
      const asking = this.adviceNeeded.value;
      if (this.human && asking && !askedBefore) this.adviceCount.value++;
      askedBefore = asking;
    });

    // Set digging for 5 seconds
    effect(() => {
      const a = this.advice.value;
      if (!this.adviceNeeded.value) return;
      const d = a instanceof Array ? a[0] : 0;
      digging.value = d;
      if (d) {
        setTimeout(
          () => {
            digging.value = 0;
          },
          this.human ? 5000 : 1200,
        );
      }
    });

    // Select or assign after digging
    effect(() => {
      if (digging.value) return;
      if (!this.adviceNeeded.value) return;
      if (this.roll.value.length < 5) return;
      if (this.advice.value instanceof Array) {
        const a = [...this.advice.value];
        this.selection.value = this.roll.value.map((v) => {
          const i = a.indexOf(v);
          const selected = i >= 0;
          if (selected) a.splice(i, 1);
          return selected;
        });
      } else if (typeof this.advice.value === "number") {
        assignScore(this.advice.value);
      }
    });
  }

  reset() {
    this.scores.value = Array(13).fill(null);
    this.selection.value = Array(5).fill(false);
    this.roll.value = [];
    this.throwNum.value = 0;
    this.throwing.value = 0;
    this.perfect.value = false;
    this.roundComplete.value = false;
    this.combo.value = 0;
    this.roundPerfect.value = true;
    this.flawless.value = true;
    this.piggyPick.value = null;
    this.piggyKeep.value = null;
    this.piggySeen.value = false;
    this.badgeFlawless.value = true;
    this.adviceNeeded.value = false;
    this.adviceCount.value = 0;
    this.longestCombo.value = 0;
  }
}

class PlayerStateWithHistory extends PlayerState {
  prevState = signal<Snapshot | null>(null);
  constructor() {
    super();
  }
}

class ComputerPlayer extends PlayerStateWithHistory {
  constructor() {
    super();
    this.human = false;
    this.name.value = "Piggy";
    effect(() => {
      if (currentPlayerState.value === this) {
        const isBusy = digging.value || throwing.value;
        const advice = this.advice.value;
        const askedForAdvice = this.adviceNeeded.value;
        if (!isBusy) {
          if (advice !== null) {
            if (askedForAdvice) {
              if (Array.isArray(advice)) {
                setTimeout(rollDice, 800);
              }
            } else {
              this.adviceNeeded.value = true;
            }
          } else if (this.throwNum.value < 4) {
            rollDice();
          }
        }
      }
    });
  }
}

export const players = signal<PlayerStateWithHistory[]>([]);

export function addPlayer() {
  players.value = players.value.concat(new PlayerStateWithHistory());
}

addPlayer();

// iOS 13+ gates devicemotion/deviceorientation behind an explicit permission
// prompt that may only be triggered from a user gesture. Granting one grants
// the shared "Motion & Orientation Access" permission, so the second call
// resolves without a second prompt. Every other platform lacks these methods
// and fires the events freely, so this is a no-op there.
export async function requestMotionPermission() {
  const request = (ctor: unknown) => {
    const fn = (ctor as { requestPermission?: () => Promise<string> })
      ?.requestPermission;
    return typeof fn === "function"
      ? fn.call(ctor).catch(() => undefined)
      : Promise.resolve();
  };
  const motion = await request(window.DeviceMotionEvent);
  await request(window.DeviceOrientationEvent);
  // An explicit iOS "denied" rules the sensor out for good. Otherwise (granted,
  // or no prompt at all) probe for a real reading before promising "shake to
  // throw": desktops either never fire devicemotion or report null components,
  // whereas a genuine sensor reports numbers — even ~0 when the device is still.
  if (motion === "denied") return;
  const onProbe = (e: DeviceMotionEvent) => {
    const a = e.acceleration;
    if (a && [a.x, a.y, a.z].some((v) => typeof v === "number")) {
      motionAvailable.value = true;
      stop();
    }
  };
  const stop = () => {
    window.removeEventListener("devicemotion", onProbe);
    clearTimeout(timer);
  };
  window.addEventListener("devicemotion", onProbe);
  // Silence within the window means no usable sensor; stop listening.
  const timer = setTimeout(stop, 2000);
}

export function startGame(names: string[]) {
  // Fire-and-forget within the "Let's go" tap's gesture so the shake-to-roll
  // and tilt effects can receive sensor events on iOS.
  void requestMotionPermission();
  const roster: PlayerStateWithHistory[] = names.map((name) => {
    const player = new PlayerStateWithHistory();
    player.name.value = name;
    return player;
  });
  if (computerPlayer.value) roster.push(new ComputerPlayer());
  batch(() => {
    showStats.value = false;
    settingsOpen.value = false;
    started.value = true;
    currentPlayer.value = 0;
    players.value = roster;
  });
  history.pushState(null, ""); // prevent back button from resetting game
}

// Start an online game from the agreed roster (broadcast by the host). Every
// device builds the same seat order; `localId` picks the seat this device
// drives. The roster carries full board snapshots, so a fresh lobby sends empty
// sheets while "split to devices" hands over a game already in progress.
export function startOnlineGame(roster: PlayerSync[], localId: string) {
  void requestMotionPermission();
  const seats = roster.map((r) => {
    const p = new PlayerStateWithHistory();
    p.id = r.id;
    p.name.value = r.name;
    p.scores.value = r.scores;
    p.combo.value = r.combo;
    p.longestCombo.value = r.longestCombo;
    p.flawless.value = r.flawless;
    p.adviceCount.value = r.adviceCount;
    return p;
  });
  const idx = Math.max(
    0,
    roster.findIndex((r) => r.id === localId),
  );
  batch(() => {
    showStats.value = false;
    settingsOpen.value = false;
    online.value = true;
    started.value = true;
    localPlayer.value = idx;
    currentPlayer.value = idx;
    players.value = seats;
  });
  history.pushState(null, "");
}

// The snapshot this device broadcasts about its own player.
export function localSnapshot(): PlayerSync {
  const p = localPlayerState.value;
  return {
    id: p.id,
    name: p.name.value ?? "",
    scores: p.scores.value,
    combo: p.combo.value,
    longestCombo: p.longestCombo.value,
    flawless: p.flawless.value,
    adviceCount: p.adviceCount.value,
  };
}

// Fold an incoming snapshot into the matching remote seat (read-only replica).
export function applyRemoteSync(s: PlayerSync) {
  const p = players.value.find((p) => p.id === s.id);
  if (!p) return;
  batch(() => {
    p.connected.value = true;
    if (s.name) p.name.value = s.name;
    p.scores.value = s.scores;
    p.combo.value = s.combo;
    p.longestCombo.value = s.longestCombo;
    p.flawless.value = s.flawless;
    p.adviceCount.value = s.adviceCount;
  });
}

// A peer dropped — free the barrier and the game-finished check from waiting on
// it. Its last-known board stays visible on the leaderboard.
export function markDisconnected(id: string) {
  const p = players.value.find((p) => p.id === id);
  if (p) p.connected.value = false;
}

export function playAgain() {
  batch(() => {
    currentPlayer.value = 0;
    players.value.forEach((p) => p.reset());
  });
}

// Abandon the current game (or leave the leaderboard) and return to the player
// picker. The unfinished game is simply discarded — nothing is recorded.
export function newGame() {
  batch(() => {
    showStats.value = false;
    settingsOpen.value = false;
    started.value = false;
    // Drop any online session; net.ts watches `online` and tears down the room.
    online.value = false;
    roomId.value = null;
    rosterDraft.value = [];
    players.value = [];
    addPlayer();
  });
}

// End-of-game "play again": back to the roster picker with this game's party
// (the humans) pre-selected, so the common case is one tap on "Let's go". Piggy
// rides along via the persistent `computerPlayer` flag. The player can still add
// or drop people before starting.
export function replayWithParty() {
  const names = players.value
    .filter((p) => p.human)
    .map((p) => p.name.value ?? "")
    .filter(Boolean);
  batch(() => {
    showStats.value = false;
    settingsOpen.value = false;
    started.value = false;
    online.value = false;
    roomId.value = null;
    rosterDraft.value = names;
    players.value = [];
    addPlayer();
  });
}

export const currentPlayerState = computed(
  () => players.value[currentPlayer.value],
);

export const round = computed(
  () =>
    currentPlayerState.value.scores.value.filter((s) => s !== null).length + 1,
);

// Completed rounds = filled categories.
function filledCount(p: PlayerState) {
  return p.scores.value.filter((s) => s !== null).length;
}

export const localPlayerState = computed(
  () => players.value[localPlayer.value],
);

// Online round barrier: the game advances in lockstep. `globalRound` is the
// number of rounds every still-connected player has finished; a player who has
// finished more must wait for the rest to catch up. Derived purely from the
// replicated score sheets — no central authority needed.
export const globalRound = computed(() => {
  const connected = players.value.filter((p) => p.connected.value);
  if (!connected.length) return 0;
  return Math.min(...connected.map(filledCount));
});

// True when the local player has completed the current round but the others
// haven't caught up — drives the "waiting for …" overlay and blocks rolling.
export const waiting = computed(
  () =>
    online.value &&
    !gameFinished.value &&
    filledCount(localPlayerState.value) > globalRound.value,
);

// Names of the players still a round behind, for the waiting overlay.
export const waitingFor = computed(() =>
  players.value
    .filter((p) => p.connected.value && filledCount(p) === globalRound.value)
    .map((p) => p.name.value ?? ""),
);

export function select(index: number) {
  const { selection, human } = currentPlayerState.value;
  if (human) {
    selection.value = selection.value.map((selected, i) =>
      i === index ? !selected : selected,
    );
  }
}

export function rollDice(force = false) {
  const {
    roll,
    selection,
    throwNum,
    perfect,
    roundComplete,
    roundPerfect,
    flawless,
    badgeFlawless,
    piggyPick,
    piggyKeep,
    piggySeen,
    advice,
    adviceNeeded,
    prevState,
  } = currentPlayerState.value;
  const keep = roll.value.filter((_, i) => selection.value[i]);
  // Proactive coaching: before re-rolling, if the kept dice aren't Piggy's pick,
  // surface the hint and hold the throw. force (apply / roll anyway) skips it,
  // and so does piggySeen — once the player has been shown Piggy's recommendation
  // this turn, further deviations don't re-nag (they just go un-celebrated).
  if (
    !force &&
    piggyHints.value &&
    !adviceNeeded.value &&
    !piggySeen.value &&
    roll.value.length === 5 &&
    advice.value instanceof Array &&
    !rollsMatch(advice.value, keep)
  ) {
    // The player peeked at Piggy's pick: hold the throw and mark the round as
    // seen, so they can't undo-and-hand-copy their way to a badge. Peeking also
    // ends the spotless run (later perfect rounds show "Nice" instead of
    // "Perfekt!") and bars this round from the combo.
    batch(() => {
      piggyKeep.value = advice.value as number[];
      piggySeen.value = true;
      roundPerfect.value = false;
      flawless.value = false;
    });
    return;
  }
  batch(() => {
    // A new throw: this is no longer a round-completion badge, so the combo
    // multiplier must not show. The combo is tallied per round (in assignScore),
    // not per keep — here we only track whether this keep-and-reroll keeps the
    // round flawless. A suboptimal keep (or asking Piggy) breaks the round and
    // ends the flawless run.
    roundComplete.value = false;
    const optimalKeep =
      !force &&
      !adviceNeeded.value &&
      advice.value instanceof Array &&
      rollsMatch(advice.value, keep);
    // Celebrate a matching dice pick with the badge right away (without the combo
    // multiplier — that waits for the round to complete). The wording reflects the
    // turn so far: "Perfekt!" while the round is still spotless, "Stark" once the
    // player has deviated this turn but is now back on Piggy's line. A peek at
    // Piggy (piggySeen) already cleared roundPerfect, so it reads as "Stark" — but
    // it no longer suppresses the badge entirely.
    perfect.value = optimalKeep;
    if (optimalKeep) badgeFlawless.value = roundPerfect.value;
    if (advice.value instanceof Array && !optimalKeep) {
      roundPerfect.value = false;
      flawless.value = false;
    }
    piggyPick.value = null;
    piggyKeep.value = null;
    roll.value = keep;
    prevState.value = null;
    selection.value = Array(5).fill(true).fill(false, roll.value.length);
    adviceNeeded.value = false;
    if (!throwing.value) throwNum.value++;
    throwing.value = 5 - roll.value.length;
  });
}

export function setResult(result: number[]) {
  batch(() => {
    throwing.value = 0;
    const { roll } = currentPlayerState.value;
    roll.value = roll.value.concat(result).slice(0, 5);
  });
}

export function assignScore(cat: number) {
  const {
    scores,
    roll,
    selection,
    throwNum,
    prevState,
    perfect,
    roundComplete,
    combo,
    roundPerfect,
    flawless,
    badgeFlawless,
    piggyPick,
    piggySeen,
    advice,
    adviceNeeded,
  } = currentPlayerState.value;

  if (scores.value[cat] === null && roll.value.length === 5) {
    batch(() => {
      const optimalPick = !adviceNeeded.value && advice.value === cat;
      if (!optimalPick) {
        roundPerfect.value = false;
        flawless.value = false;
        // Suboptimal entry made on the player's own: remember Piggy's better
        // category to offer it via the hint banner — unless the player has
        // already been shown Piggy's recommendation this turn (a keep hint),
        // in which case we don't nag a second time.
        piggyPick.value =
          !adviceNeeded.value &&
          !piggySeen.value &&
          typeof advice.value === "number" &&
          piggyHints.value
            ? advice.value
            : null;
      } else {
        piggyPick.value = null;
      }
      // The round is complete. A fully flawless round extends the combo streak;
      // anything else resets it, and only a flawless round unlocks the combo
      // multiplier badge. The celebration badge itself, though, fires whenever
      // *this* final pick was optimal — "Perfekt!" if the whole turn stayed
      // spotless, "Stark" if the player had deviated earlier but landed the pick.
      const roundWasPerfect = roundPerfect.value;
      perfect.value = optimalPick;
      badgeFlawless.value = roundWasPerfect;
      roundComplete.value = roundWasPerfect; // unlocks the combo multiplier badge
      combo.value = roundWasPerfect ? combo.value + 1 : 0;
      roundPerfect.value = true; // start the next round fresh
      piggySeen.value = false; // …and let the next round earn a badge again
      const score = getCategoryScore(cat, roll.value);
      prevState.value = snapshot();
      scores.value = [
        ...scores.value.slice(0, cat),
        score,
        ...scores.value.slice(cat + 1),
      ];
      // Online there is no pass-and-play hand-off: each device plays its own
      // seat, so go straight to the next round (the barrier gates rolling).
      throwNum.value = players.value.length > 1 && !online.value ? 4 : 0;
      roll.value = [];
      selection.value = Array(5).fill(false);
      adviceNeeded.value = false;
    });
  }
}

export function nextPlayer() {
  batch(() => {
    // Clear the badge, but keep the player's perfect-round streak — it carries
    // across their turns until they slip up.
    currentPlayerState.value.perfect.value = false;
    currentPlayerState.value.piggyPick.value = null;
    currentPlayerState.value.piggyKeep.value = null;
    currentPlayerState.value.prevState.value = null;
    currentPlayer.value = (currentPlayer.value + 1) % players.value.length;
    currentPlayerState.value.throwNum.value = 0;
    history.pushState(null, ""); // prevent back button from resetting game
  });
}

export function undo() {
  const {
    scores,
    roll,
    throwNum,
    selection,
    prevState,
    perfect,
    combo,
    roundPerfect,
    piggyPick,
    piggyKeep,
  } = currentPlayerState.value;
  const prev = prevState.value;
  if (prev) {
    const redoState = { ...snapshot(), redo: !prev.redo };
    batch(() => {
      perfect.value = false;
      combo.value = 0;
      roundPerfect.value = false;
      piggyPick.value = null;
      piggyKeep.value = null;
      scores.value = prev.scores;
      roll.value = prev.roll;
      throwNum.value = prev.throwNum;
      selection.value = prev.selection;
      prevState.value = redoState;
    });
  }
}

// Take back the suboptimal entry the player just made and replay Piggy's
// recommended category instead. undo() restores the open category + the 5-dice
// roll (and clears piggyPick); flagging adviceNeeded then reuses the same
// "ask Piggy" effect that auto-enters the advised category — so the replay
// isn't counted as a perfect/combo move.
export function applyPiggyMove() {
  const player = currentPlayerState.value;
  if (player.piggyPick.value === null) return;
  undo();
  player.adviceNeeded.value = true;
}

// Adopt Piggy's recommended dice (translate the kept values into a selection),
// then roll. force keeps the throw from being scored as perfect.
export function applyPiggyKeep() {
  const player = currentPlayerState.value;
  const keep = player.piggyKeep.value;
  if (!keep) return;
  // Accepting Piggy's pick counts as leaning on Piggy — same as the category
  // "use it" path (which bumps adviceCount via adviceNeeded). Without this, a
  // game where you only ever took the dice hint would still read as "no Piggy".
  if (player.human) player.adviceCount.value++;
  const remaining = [...keep];
  player.selection.value = player.roll.value.map((v) => {
    const i = remaining.indexOf(v);
    if (i >= 0) {
      remaining.splice(i, 1);
      return true;
    }
    return false;
  });
  player.piggyKeep.value = null;
  rollDice(true);
}

// Dismiss the keep hint and roll with the player's own selection after all.
export function rollAnyway() {
  currentPlayerState.value.piggyKeep.value = null;
  rollDice(true);
}

// Persist the whole game exactly once when every scoreboard is full. The flag
// guards against re-firing while gameFinished stays true (e.g. unrelated signal
// changes), and resets when a new/replayed game clears it.
let gameRecorded = false;
effect(() => {
  if (!gameFinished.value) {
    gameRecorded = false;
    return;
  }
  if (gameRecorded) return;
  gameRecorded = true;
  const roster = players.value;
  const ranks = rankPlayers(roster.map((p) => p.totalScore.value));
  const rec: GameRecord = {
    id: crypto.randomUUID(),
    date: Date.now(),
    players: roster.map((p, i) => ({
      name: p.name.value ?? "",
      human: p.human,
      scores: p.scores.value,
      bonus: p.bonus.value ?? 0,
      total: p.totalScore.value,
      adviceCount: p.adviceCount.value,
      longestCombo: p.longestCombo.value,
      flawless: p.flawless.value,
      rank: ranks[i],
    })),
  };
  recordGame(rec);
});

// Dev-only: jump straight to a finished game to exercise the leaderboard
// ceremony without playing 13 rounds. Builds a fully-scored roster in a single
// batch so the leaderboard mounts directly (no empty-sheet intermediate frame).
//   finishGame()          → 3 humans
//   finishGame(4)         → 4 humans (gold/silver/bronze + poo)
//   finishGame(2, true)   → 2 humans + Piggy
//   finishGame(1)         → solo (personal tally → stats)
// Stripped from production by the import.meta.env.DEV guard.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).finishGame = (
    n = 3,
    withPiggy = false,
  ) => {
    const names = ["Felix", "Anna", "Ben", "Clara"].slice(0, Math.max(1, n));
    const roster: PlayerStateWithHistory[] = names.map((name, idx) => {
      const p = new PlayerStateWithHistory();
      p.name.value = name;
      // Vary upper sections so some clear the 63 bonus and some don't.
      const upper = [1, 2, 3, 4, 5, 6].map((face) =>
        idx % 2 === 0 ? face * (idx + 2) : face,
      );
      const lower = [
        22,
        0,
        25,
        30,
        idx === 0 ? 40 : 0,
        idx === 0 ? 50 : 0,
        30 - idx * 6,
      ];
      p.scores.value = [...upper, ...lower];
      p.adviceCount.value = idx;
      p.longestCombo.value = idx === 0 ? 4 : 0;
      p.flawless.value = idx === 0;
      return p;
    });
    if (withPiggy) {
      const piggy = new ComputerPlayer();
      piggy.scores.value = [3, 6, 9, 12, 15, 18, 24, 0, 25, 30, 40, 0, 20];
      roster.push(piggy);
    }
    batch(() => {
      showStats.value = false;
      settingsOpen.value = false;
      online.value = false;
      started.value = true;
      currentPlayer.value = 0;
      players.value = roster;
    });
  };
}

function snapshot() {
  const { scores, roll, selection, throwNum } = currentPlayerState.value;
  return {
    scores: scores.value,
    roll: roll.value,
    throwNum: throwNum.value,
    selection: selection.value,
    redo: false,
  };
}

type Snapshot = ReturnType<typeof snapshot>;
