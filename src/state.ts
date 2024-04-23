import { batch, computed, signal } from "@preact/signals";
import _ from "lodash";
import { getCategoryScore } from "./advisor/score-calculator";

export const manual = signal(false);
export const throwing = signal(0);
export const currentPlayer = signal(0);

class PlayerState {
  throwNum = signal(0);
  entering = signal(false);
  throwing = signal(0);
  roll = signal<number[]>([]);
  selection = signal<boolean[]>(Array(5).fill(false));
  scores = signal<Array<number | null>>(Array(13).fill(null));
}

class PlayerStateWithHistory extends PlayerState {
  prevState = signal<Snapshot | null>(null);
}

const players = signal<PlayerStateWithHistory[]>([]);

export function addPlayer() {
  players.value = players.value.concat(new PlayerStateWithHistory());
}

addPlayer();

export const currentPlayerState = computed(
  () => players.value[currentPlayer.value]
);

export const round = computed(
  () =>
    currentPlayerState.value.scores.value.filter((s) => s !== null).length + 1
);

export function add(v: number) {
  const { roll, entering, selection, prevState } = currentPlayerState.value;
  if (prevState.value?.redo) prevState.value = null;
  if (roll.value.length === 4) {
    const selected = selection.value.filter(Boolean).length;
    prevState.value = { ...snapshot(), roll: roll.value.slice(0, selected) };
    entering.value = false;
  }
  roll.value = [...roll.value, v];
}

export function del() {
  const { roll } = currentPlayerState.value;
  roll.value = roll.value.slice(0, -1);
}

export function select(index: number) {
  const { selection } = currentPlayerState.value;
  selection.value = selection.value.map((selected, i) =>
    i === index ? !selected : selected
  );
}

export function rollDice() {
  const { roll, selection, throwNum, entering, prevState } =
    currentPlayerState.value;
  if (manual.value) {
    prevState.value = snapshot();
    roll.value = roll.value.filter((_, i) => selection.value[i]);
    selection.value = Array(5).fill(true).fill(false, roll.value.length);
    entering.value = true;
    throwNum.value++;
  } else {
    roll.value = roll.value.filter((_, i) => selection.value[i]);
    if (!throwing.value) throwNum.value++;
    throwing.value = 5 - roll.value.length;
    prevState.value = null;
    selection.value = Array(5).fill(true).fill(false, roll.value.length);
  }
}

export function setResult(result: number[]) {
  throwing.value = 0;
  const { roll } = currentPlayerState.value;
  roll.value = roll.value.concat(result).slice(0, 5);
}

export function assignScore(cat: number) {
  const { scores, roll, selection, throwNum, prevState } =
    currentPlayerState.value;
  if (scores.value[cat] === null && roll.value.length === 5) {
    batch(() => {
      const score = getCategoryScore(cat, roll.value);
      prevState.value = snapshot();
      scores.value = [
        ...scores.value.slice(0, cat),
        score,
        ...scores.value.slice(cat + 1),
      ];
      throwNum.value = 0;
      roll.value = [];
      selection.value = Array(5).fill(false);
    });
  }
}

export function undo() {
  const { scores, roll, throwNum, selection, entering, prevState } =
    currentPlayerState.value;
  const prev = prevState.value;
  if (prev) {
    const redoState = { ...snapshot(), redo: !prev.redo };
    batch(() => {
      scores.value = prev.scores;
      roll.value = prev.roll;
      throwNum.value = prev.throwNum;
      selection.value = prev.selection;
      entering.value = prev.entering;
      prevState.value = redoState;
    });
  }
}

function snapshot() {
  const { scores, roll, selection, throwNum, entering } =
    currentPlayerState.value;
  return {
    scores: scores.value,
    roll: roll.value,
    throwNum: throwNum.value,
    selection: selection.value,
    entering: entering.value,
    redo: false,
  };
}

type Snapshot = ReturnType<typeof snapshot>;
