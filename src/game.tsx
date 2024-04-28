import Die from "./Die";
import _ from "lodash";
import { DeleteIcon, RedoIcon, UndoIcon } from "./icons";
import {
  currentPlayerState,
  add,
  i18n,
  assignScore,
  del,
  select,
  rollDice,
  undo,
  round,
  throwing,
  currentPlayer,
  setResult,
  nextPlayer,
  manual,
  players,
} from "./state";
import { Scene } from "./three/scene";
import { Button } from "./styled";

export function Game() {
  const { scores, roll, selection, throwNum, entering, prevState, advice } =
    currentPlayerState.value;

  const t = i18n.value;
  const showInput = entering.value || (throwNum.value === 0 && manual.value);
  const selected = selection.value.filter(Boolean).length;
  const throwInProgress = throwing.value > 0 || showInput;
  const lastThrow = throwNum.value >= 3;
  const shouldSelect =
    roll.value.length === 5 && throwNum.value < 3 && !selected;
  const canThrow = !lastThrow && !throwInProgress && selected < 5;

  return (
    <div class="flex-1 flex flex-col gap-6 text-sm max-w-500 mx-auto">
      <Scene numberOfDice={throwing.value} onResult={setResult} />
      <div class="bg-white shadow p-6 flex flex-col gap-6">
        <h1 class="font-bold text-xl flex items-center gap-1">
          {players.value.length > 1
            ? t.playerX(currentPlayer.value + 1)
            : t.roundX(round.value)}
          {throwNum.value > 0 && throwNum.value <= 3 && (
            <span class="font-extralight"> – {t.rollX(throwNum.value)}</span>
          )}
          {prevState.value && (
            <button onClick={undo}>
              {prevState.value.redo ? <RedoIcon /> : <UndoIcon />}
            </button>
          )}
        </h1>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid row-span-7 grid-rows-subgrid">
            {scores.value.slice(0, 6).map((score, i) => (
              <Scorebox
                key={i}
                category={i18n.value.categoryNames[i]}
                score={score}
                onClick={() => assignScore(i)}
              />
            ))}
            <Scorebox category={t.bonus} score={0} />
          </div>
          <div class="grid row-span-7 grid-rows-subgrid">
            {scores.value.slice(6).map((score, i) => (
              <Scorebox
                key={i}
                category={i18n.value.categoryNames[i + 6]}
                score={score}
                onClick={() => assignScore(i + 6)}
              />
            ))}
          </div>
        </div>
        <div class="flex flex-col">
          <div class="flex gap-2">
            {_.range(5).map((i) =>
              i < roll.value.length ? (
                <Die
                  key={i}
                  value={roll.value[i]}
                  onPress={() => {
                    if (roll.value.length === 5) select(i);
                  }}
                  selected={selection.value[i]}
                />
              ) : (
                <Die value={0} />
              )
            )}
            <div>Advice: {advice}</div>
          </div>
          {shouldSelect && t.selectKeepers}
          {(selected === 5 || (lastThrow && roll.value.length === 5)) &&
            t.pickCategory}
        </div>
      </div>
      {showInput && (
        <div class="rounded p-4 bg-primary-500 text-white">
          <div>{t.clickDiceToEnterRoll}</div>
          <div class="flex gap-2">
            <Die value={1} onPress={add} />
            <Die value={2} onPress={add} />
            <Die value={3} onPress={add} />
            <Die value={4} onPress={add} />
            <Die value={5} onPress={add} />
            <Die value={6} onPress={add} />
            {roll.value.length > 0 && (
              <button onClick={del}>
                <DeleteIcon />
              </button>
            )}
          </div>
        </div>
      )}
      <div class="self-center">
        {canThrow && (
          <Button onClick={rollDice}>
            {selected
              ? t.rollXDice(5 - selected)
              : throwNum.value > 0
              ? t.reRollAll
              : t.rollDice}
          </Button>
        )}
        {throwNum.value > 3 && (
          <Button onClick={nextPlayer}>{t.nextPlayer}</Button>
        )}
      </div>
      {/* <Pig value={4} /> */}
    </div>
  );
}

function Scorebox({
  category,
  score,
  onClick,
}: {
  category: string;
  score: number | null;
  onClick?: () => unknown;
}) {
  return (
    <div
      class="border-b border-neutral-400 p-1 grid grid-cols-[5fr_2fr] items-end"
      onClick={onClick}
    >
      <div class="min-w-[min(4rem,100%)] justify-self-start">{category}</div>
      <div class="justify-self-start">{score}</div>
    </div>
  );
}
