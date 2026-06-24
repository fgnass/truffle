import { computed, signal } from "@preact/signals";

// Append-only log of completed games, persisted as a single JSON blob in
// localStorage. Everything the stats screens need is derived from this in plain
// TS — no query engine. The version lives in the key so a schema change is just
// a new key + a one-off migration.
const STORAGE_KEY = "truffle.games.v1";

// One player's result within a finished game. `scores` mirrors PlayerState
// (13 categories, index 11 = Kniffel); the rest are the coaching/meta signals
// captured at game end so they survive past the in-memory PlayerState.
export type PlayerResult = {
  name: string;
  human: boolean;
  scores: (number | null)[];
  bonus: number;
  total: number;
  adviceCount: number; // how often Piggy was asked this game
  longestCombo: number; // best streak of Piggy-optimal moves
  flawless: boolean; // played the whole game without a misstep or hint
  rank: number; // 1 = winner of this game
};

export type GameRecord = {
  id: string;
  date: number; // epoch ms
  players: PlayerResult[];
};

export const games = signal<GameRecord[]>(load());

export function recordGame(rec: GameRecord) {
  games.value = [...games.value, rec];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games.value));
}

function load(): GameRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GameRecord[];
  } catch {
    // Corrupt blob — start fresh rather than crash.
    return [];
  }
}

// Standard competition ranking within a single game: rank = (players strictly
// ahead) + 1, so ties share a rank.
export function rankPlayers(totals: number[]): number[] {
  return totals.map((t) => totals.filter((o) => o > t).length + 1);
}

// Every player result across all games, flattened — the basis for most stats.
export const allResults = computed(() => games.value.flatMap((g) => g.players));

// Distinct human names ever seen, for the roster autocomplete (replaces the old
// alasql `players` table). Newest-first so recent opponents surface first.
export const knownPlayers = computed(() => {
  const seen = new Set<string>();
  for (const g of [...games.value].reverse()) {
    for (const p of g.players) if (p.human) seen.add(p.name);
  }
  return [...seen];
});

// Category index of the Truffle (5-of-a-kind; matches PlayerState.scores).
export const TRUFFLE_INDEX = 11;

// All of one player's results across every game, oldest-first.
function resultsFor(name: string): PlayerResult[] {
  return games.value.flatMap((g) => g.players.filter((p) => p.name === name));
}

export type Ranking = { rank: number; of: number };

// 1-based rank of a score among a pool, ties sharing a rank (strict "better
// than" count + 1). The score is assumed to already be in the pool — it is,
// since a game is recorded the moment it finishes.
function rankIn(total: number, pool: number[]): Ranking {
  return { rank: pool.filter((t) => t > total).length + 1, of: pool.length };
}

// "This game is rank X of all games ever played."
export function globalRank(total: number): Ranking {
  return rankIn(total, allResults.value.map((r) => r.total));
}

// "This game is rank X of <name>'s games."
export function personalRank(name: string, total: number): Ranking {
  return rankIn(total, resultsFor(name).map((r) => r.total));
}

// ---------------------------------------------------------------------------
// Leaderboards. Each takes an optional `roster` to scope to a set of players
// ("this round"); omit it for an all-time board.
// ---------------------------------------------------------------------------

const rosterFilter = (roster?: string[]) => {
  if (!roster) return () => true;
  const set = new Set(roster);
  return (name: string) => set.has(name);
};

export type ScoreEntry = {
  name: string;
  human: boolean;
  score: number;
  date: number;
  truffle: boolean;
  flawless: boolean;
  adviceCount: number; // 0 = clean game (no Piggy)
};

function entriesFrom(records: GameRecord[]): ScoreEntry[] {
  return records.flatMap((g) =>
    g.players.map((p) => ({
      name: p.name,
      human: p.human,
      score: p.total,
      date: g.date,
      truffle: (p.scores[TRUFFLE_INDEX] ?? 0) > 0,
      flawless: p.flawless,
      adviceCount: p.adviceCount,
    }))
  );
}

function scoreEntries(): ScoreEntry[] {
  return entriesFrom(games.value);
}

function topHumanScores(records: GameRecord[], limit: number): ScoreEntry[] {
  return entriesFrom(records)
    .filter((e) => e.human)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// The high-score board as it stood *before* the most recent game. The end screen
// renders this first, then transitions to the live board so the freshly-recorded
// entries are seen sliding into place.
export function highScoresBefore(limit = 10): ScoreEntry[] {
  return topHumanScores(games.value.slice(0, -1), limit);
}

// The ranked boards are human-only: Piggy plays optimally and would monopolise
// every list. Piggy lives in the head-to-head section instead, as the benchmark.

// Highest single-game scores, one row per result.
export function highScores(roster?: string[], limit = 10): ScoreEntry[] {
  const ok = rosterFilter(roster);
  return scoreEntries()
    .filter((e) => e.human && ok(e.name))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Per-player summary card.
// ---------------------------------------------------------------------------

export type PlayerSummary = {
  name: string;
  human: boolean;
  games: number;
  best: number;
  worst: number; // lowest total
  wins: number; // multiplayer wins
  winRate: number | null; // over multiplayer games; null if they've played none
  truffles: number; // games with a truffle
  bestCombo: number; // best streak of Piggy-optimal moves ever
  flawlessGames: number; // games played without a misstep or hint
};

export function playerSummary(name: string): PlayerSummary {
  const mine = resultsFor(name);
  const n = mine.length;
  const totals = mine.map((r) => r.total);

  // Win rate counts multiplayer games only — a solo game's rank 1 is trivial.
  let mpGames = 0;
  let wins = 0;
  for (const g of games.value) {
    if (g.players.length < 2) continue;
    const me = g.players.find((p) => p.name === name);
    if (!me) continue;
    mpGames++;
    if (me.rank === 1) wins++;
  }

  const truffles = mine.filter((r) => (r.scores[TRUFFLE_INDEX] ?? 0) > 0).length;

  return {
    name,
    human: mine[0]?.human ?? true,
    games: n,
    best: n ? Math.max(...totals) : 0,
    worst: n ? Math.min(...totals) : 0,
    wins,
    winRate: mpGames ? wins / mpGames : null,
    truffles,
    bestCombo: n ? Math.max(...mine.map((r) => r.longestCombo)) : 0,
    flawlessGames: mine.filter((r) => r.flawless).length,
  };
}

// ---------------------------------------------------------------------------
// Per-player: how a single game compares to that player's own history.
// ---------------------------------------------------------------------------

export type GameComparison = {
  rank: number; // personal rank of this score (1 = best ever)
  of: number;
  isBest: boolean;
  isFirst: boolean; // their very first game
  vsAverage: number; // delta against their average (rounded by the caller)
};

export function compareToHistory(name: string, total: number): GameComparison {
  const totals = resultsFor(name).map((r) => r.total);
  const { rank, of } = rankIn(total, totals);
  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : total;
  return {
    rank,
    of,
    isBest: rank === 1 && of > 1,
    isFirst: of <= 1,
    vsAverage: total - avg,
  };
}

// ---------------------------------------------------------------------------
// Dev-only seeding. Exposed on window in dev builds so the stats screens can be
// exercised without playing dozens of real games:
//   seedGames(30)  → append 30 random games
//   clearGames()   → wipe the log
// Stripped from production by the `import.meta.env.DEV` guard at the bottom.
// ---------------------------------------------------------------------------

const SEED_NAMES = ["Felix", "Anna", "Ben", "Clara", "David"];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const chance = (p: number) => Math.random() < p;

// One plausible scorecard. `strong` biases towards higher categories (used for
// Piggy, who plays optimally).
function seededResult(name: string, human: boolean, strong = false): PlayerResult {
  const hit = (p: number) => (strong ? Math.min(1, p + 0.2) : p);
  const scores: (number | null)[] = [];
  for (let face = 1; face <= 6; face++) {
    scores.push(face * randInt(strong ? 2 : 0, strong ? 5 : 4));
  }
  scores.push(chance(hit(0.8)) ? randInt(15, 26) : 0); // three of a kind
  scores.push(chance(hit(0.55)) ? randInt(18, 28) : 0); // four of a kind
  scores.push(chance(hit(0.7)) ? 25 : 0); // full house
  scores.push(chance(hit(0.8)) ? 30 : 0); // small straight
  scores.push(chance(hit(0.55)) ? 40 : 0); // large straight
  scores.push(chance(strong ? 0.45 : 0.2) ? 50 : 0); // truffle
  scores.push(randInt(15, 28)); // chance

  const upper = scores.slice(0, 6).reduce<number>((a, b) => a + (b ?? 0), 0);
  const bonus = upper >= 63 ? 35 : 0;
  const lower = scores.slice(6).reduce<number>((a, b) => a + (b ?? 0), 0);
  return {
    name,
    human,
    scores,
    bonus,
    total: upper + bonus + lower,
    adviceCount: !strong && chance(0.4) ? randInt(1, 4) : 0,
    longestCombo: strong ? randInt(4, 9) : randInt(0, 6),
    flawless: chance(strong ? 0.6 : 0.15),
    rank: 0,
  };
}

export function seedGames(count = 20) {
  const now = Date.now();
  const recs: GameRecord[] = [];
  for (let i = 0; i < count; i++) {
    const roster = [...SEED_NAMES]
      .sort(() => Math.random() - 0.5)
      .slice(0, randInt(1, 3));
    const results = roster.map((n) => seededResult(n, true));
    if (chance(0.4)) results.push(seededResult("Piggy", false, true));
    const ranks = rankPlayers(results.map((p) => p.total));
    results.forEach((p, j) => (p.rank = ranks[j]));
    recs.push({
      id: crypto.randomUUID(),
      // spread over the last ~60 days
      date: now - randInt(0, 60) * 86_400_000 - randInt(0, 86_400_000),
      players: results,
    });
  }
  // Chronological so win-streak calculations make sense.
  recs.sort((a, b) => a.date - b.date);
  games.value = [...games.value, ...recs];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games.value));
  return games.value.length;
}

export function clearGames() {
  games.value = [];
  localStorage.removeItem(STORAGE_KEY);
}

if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.seedGames = seedGames;
  w.clearGames = clearGames;
  // eslint-disable-next-line no-console
  console.info("[truffle] dev stats helpers: seedGames(n), clearGames()");
}
