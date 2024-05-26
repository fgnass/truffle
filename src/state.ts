import { batch, computed, effect, signal } from "@preact/signals";
import _ from "lodash";

import * as translations from "./i18n";
import { getAdvice, getCategoryScore, rollsMatch } from "./strategy";

import alasql from "alasql";

export const started = signal(false);
export const virtualDice = signal(true);
export const computerPlayer = signal(false);
export const throwing = signal(0);
export const digging = signal(0);
export const currentPlayer = signal(0);

const preferredLang = Object.keys(translations).find((l) =>
  navigator.language.toLowerCase().includes(l)
);

export const lang = signal(preferredLang ?? "en");

export const i18n = computed(
  () => translations[lang.value as keyof typeof translations]
);

export const allPlayersNamed = computed(() =>
  players.value.every((p) => !!p.name.value)
);

export const gameFinished = computed(() =>
  players.value.every((p) => !!p.scoreboardFull.value)
);

export const finalRanking = computed(() => {
  if (!gameFinished.value) return [];
  const ranked = [...players.value];
  ranked.sort((a, b) => b.totalScore.value - a.totalScore.value);
  return ranked;
});

alasql("create localStorage database if not exists truffle");
alasql("attach localStorage database truffle");
alasql("use truffle");
alasql("create table if not exists players (name string)");

function sum(a: number | null, b: number | null) {
  return (a ?? 0) + (b ?? 0);
}

export class PlayerState {
  human = true;
  name = signal<string | null>(null);
  throwNum = signal(0);
  throwing = signal(0);
  perfect = signal(false);
  roll = signal<number[]>([]);
  selection = signal<boolean[]>(Array(5).fill(false));
  scores = signal<Array<number | null>>(Array(13).fill(null));

  adviceNeeded = signal(false);

  upperScore = computed(() => this.scores.value.slice(0, 6).reduce(sum));

  lowerScore = computed(() => this.scores.value.slice(6).reduce(sum));

  scoreboardFull = computed(() => {
    //return this.scores.value.filter((s) => s !== null).length > 0;
    return this.scores.value.every((s) => s !== null);
  });

  upperSectionFull = computed(() =>
    this.scores.value.slice(0, 6).every((s) => s !== null)
  );

  bonus = computed(() =>
    this.upperSectionFull.value
      ? (this.upperScore.value ?? 0) >= 63
        ? 35
        : 0
      : null
  );

  totalScore = computed(() => {
    return (
      (this.upperScore.value ?? 0) +
      (this.bonus.value ?? 0) +
      (this.lowerScore.value ?? 0)
    );
  });

  advice = computed<null | string | number | number[]>(() => {
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
    effect(() => {
      const name = this.name.value;
      if (name && this.human) {
        alasql(
          "if not exists (select * from players where name = ?) insert into players values (?)",
          [name, name]
        );
      }
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
          this.human ? 5000 : 1200
        );
      }
    });

    // Select or assign after digging
    effect(() => {
      if (digging.value) return;
      if (!this.adviceNeeded.value) return;
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
    this.adviceNeeded.value = false;
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

export function removePlayer() {
  if (players.value.length > 1) players.value = players.value.slice(0, -1);
}

addPlayer();

export function start() {
  currentPlayer.value = 0;
  if (computerPlayer.value) {
    players.value.push(new ComputerPlayer());
  }
  started.value = true;
}

export function playAgain() {
  batch(() => {
    currentPlayer.value = 0;
    players.value.forEach((p) => p.reset());
  });
}

export function newGame() {
  batch(() => {
    started.value = false;
    players.value = [];
    addPlayer();
  });
}

export const currentPlayerState = computed(
  () => players.value[currentPlayer.value]
);

export const round = computed(
  () =>
    currentPlayerState.value.scores.value.filter((s) => s !== null).length + 1
);

export function add(v: number) {
  const { roll, selection, prevState } = currentPlayerState.value;
  if (prevState.value?.redo) prevState.value = null;
  if (roll.value.length === 4) {
    const selected = selection.value.filter(Boolean).length;
    prevState.value = { ...snapshot(), roll: roll.value.slice(0, selected) };
  }
  roll.value = [...roll.value, v];
}

export function del() {
  const { roll, selection } = currentPlayerState.value;
  if (!selection.value[roll.value.length - 1]) {
    roll.value = roll.value.slice(0, -1);
  }
}

export function select(index: number) {
  const { selection, human } = currentPlayerState.value;
  if (human) {
    selection.value = selection.value.map((selected, i) =>
      i === index ? !selected : selected
    );
  }
}

export function rollDice() {
  const {
    roll,
    selection,
    throwNum,
    perfect,
    advice,
    adviceNeeded,
    prevState,
  } = currentPlayerState.value;
  batch(() => {
    const keep = roll.value.filter((_, i) => selection.value[i]);
    perfect.value =
      !adviceNeeded.value &&
      advice.value instanceof Array &&
      rollsMatch(advice.value, keep);
    roll.value = keep;
    prevState.value = null;
    selection.value = Array(5).fill(true).fill(false, roll.value.length);
    adviceNeeded.value = false;
    if (!throwing.value) throwNum.value++;
    if (virtualDice.value) {
      throwing.value = 5 - roll.value.length;
    }
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
    advice,
    adviceNeeded,
  } = currentPlayerState.value;

  if (scores.value[cat] === null && roll.value.length === 5) {
    batch(() => {
      perfect.value = !adviceNeeded.value && advice.value === cat;
      const score = getCategoryScore(cat, roll.value);
      prevState.value = snapshot();
      scores.value = [
        ...scores.value.slice(0, cat),
        score,
        ...scores.value.slice(cat + 1),
      ];
      throwNum.value = players.value.length > 1 ? 4 : 0;
      roll.value = [];
      selection.value = Array(5).fill(false);
      adviceNeeded.value = false;
    });
  }
}

export function nextPlayer() {
  batch(() => {
    currentPlayerState.value.perfect.value = false;
    currentPlayerState.value.prevState.value = null;
    currentPlayer.value = (currentPlayer.value + 1) % players.value.length;
    currentPlayerState.value.throwNum.value = 0;
  });
}

export function undo() {
  const { scores, roll, throwNum, selection, prevState, perfect } =
    currentPlayerState.value;
  const prev = prevState.value;
  if (prev) {
    const redoState = { ...snapshot(), redo: !prev.redo };
    batch(() => {
      perfect.value = false;
      scores.value = prev.scores;
      roll.value = prev.roll;
      throwNum.value = prev.throwNum;
      selection.value = prev.selection;
      prevState.value = redoState;
    });
  }
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
