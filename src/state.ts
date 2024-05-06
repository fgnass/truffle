import { Signal, batch, computed, effect, signal } from "@preact/signals";
import _ from "lodash";

import * as translations from "./i18n";
import { getAdvice, getCategoryScore, rollsMatch } from "./strategy";

import alasql from "alasql";

export const started = signal(false);
export const manual = signal(false);
export const throwing = signal(0);
export const digging = signal(0);
export const currentPlayer = signal(0);
export const lang = signal<keyof typeof translations>("de");

export const i18n = computed(() => translations[lang.value]);

export const allPlayersNamed = computed(() =>
  players.value.every((p) => !!p.name.value)
);

alasql("create localStorage database if not exists truffle");
alasql("attach localStorage database truffle");
alasql("use truffle");
alasql("create table if not exists players (name string)");

class PlayerState {
  name = signal<string | null>(null);

  throwNum = signal(0);
  throwing = signal(0);
  perfect = signal(false);
  roll = signal<number[]>([]);
  selection = signal<boolean[]>(Array(5).fill(false));
  scores = signal<Array<number | null>>(Array(13).fill(null));

  adviceNeeded = signal(false);

  upperScore = computed(() =>
    this.scores.value.slice(0, 6).reduce((a, b) => (a ?? 0) + (b ?? 0))
  );

  scoreboardFull = computed(() => this.scores.value.every((s) => s !== null));

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

  advice = computed<null | string | number | number[]>(() => {
    console.log(this.throwNum.value, this.roll.value.length);
    const active = this.throwNum.value > 0 && this.throwNum.value <= 3;
    if (this.roll.value.length !== 5 || !active) {
      console.log("Exit");
      return null;
    }
    const scores = this.scores.value.map((s) => s ?? -1);
    const a = getAdvice(scores, this.throwNum.value, this.roll.value);
    console.log("Advice", a);
    if (a instanceof Array && a.length === 5 && this.throwNum.value < 3) {
      return getAdvice(scores, 3, this.roll.value);
    }
    return a;
  });

  number: Signal<number>;

  constructor(number: number) {
    this.number = signal(number);
    effect(() => {
      const name = this.name.value;
      if (name) {
        alasql(
          "if not exists (select * from players where name = ?) insert into players values (?)",
          [name, name]
        );
        //console.log(await alasql.promise("select * from players"));
      }
    });

    // Set digging for 5 seconds
    effect(() => {
      const a = this.advice.value;
      if (!this.adviceNeeded.value) return;
      const d = a instanceof Array ? a[0] : 0;
      digging.value = d;
      if (d) {
        setTimeout(() => {
          digging.value = 0;
        }, 5500);
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
        console.log("Assign to cat", this.advice.value);
        assignScore(this.advice.value);
      }
    });
  }
}

class PlayerStateWithHistory extends PlayerState {
  prevState = signal<Snapshot | null>(null);
  constructor(number: number) {
    super(number);
  }
}

export const players = signal<PlayerStateWithHistory[]>([]);

export function addPlayer() {
  players.value = players.value.concat(
    new PlayerStateWithHistory(players.value.length + 1)
  );
}

export function removePlayer() {
  if (players.value.length > 1) players.value = players.value.slice(0, -1);
}

addPlayer();

export function start() {
  started.value = true;
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
  const { selection } = currentPlayerState.value;
  selection.value = selection.value.map((selected, i) =>
    i === index ? !selected : selected
  );
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
  if (!manual.value) {
    throwing.value = 5 - roll.value.length;
  }
}

export function setResult(result: number[]) {
  throwing.value = 0;
  const { roll } = currentPlayerState.value;
  roll.value = roll.value.concat(result).slice(0, 5);
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
  currentPlayerState.value.perfect.value = false;
  currentPlayerState.value.prevState.value = null;
  currentPlayer.value = (currentPlayer.value + 1) % players.value.length;
  currentPlayerState.value.throwNum.value = 0;
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
