import Die from "./Die";
import _ from "lodash";
import { DeleteIcon, PigIcon, RedoIcon, UndoIcon } from "./icons";
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
  setResult,
  nextPlayer,
  virtualDice,
  players,
  digging,
  computerPlayer,
} from "./state";
import { Scene } from "./Scene";
import { Button } from "./styled";
import { Pig } from "./Pig";
import { ScoreBox } from "./ScoreBox";

export function Game() {
  const {
    scores,
    bonus,
    roll,
    selection,
    throwNum,
    prevState,
    perfect,
    adviceNeeded,
    name,
    human,
  } = currentPlayerState.value;

  const t = i18n.value;
  const rollComplete = roll.value.length === 5;
  const showInput = !virtualDice.value && !rollComplete;
  const selected = selection.value.filter(Boolean).length;
  const throwInProgress = throwing.value > 0;
  const lastThrow = throwNum.value >= 3;

  const shouldAssign =
    human &&
    (selected === 5 ||
      (lastThrow && rollComplete) ||
      (!virtualDice.value && !adviceNeeded.value && rollComplete));

  const shouldSelect =
    human &&
    virtualDice.value &&
    rollComplete &&
    throwNum.value < 3 &&
    !selected;

  const canThrow =
    human &&
    (virtualDice.value || throwNum.value > 0) &&
    round.value <= 13 &&
    !digging.value &&
    !lastThrow &&
    !throwInProgress &&
    selected < 5;

  return (
    <div class="flex-1 flex flex-col gap-6 text-sm w-[500px] max-w-full mx-auto">
      <div class="bg-white shadow-paper p-6 flex flex-col gap-6 relative overflow-hidden">
        <h1 class="font-bold text-xl flex items-center gap-1 leading-none min-h-6">
          {players.value.length > 1 ? name.value : t.roundX(round.value)}
          {throwNum.value > 0 && throwNum.value <= 3 && (
            <span class="font-extralight"> – {t.rollX(throwNum.value)}</span>
          )}
          {human && prevState.value && (
            <button onClick={undo}>
              {prevState.value.redo ? <RedoIcon /> : <UndoIcon />}
            </button>
          )}
        </h1>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid row-span-7 grid-rows-subgrid">
            {scores.value.slice(0, 6).map((score, i) => (
              <ScoreBox
                key={i}
                category={i18n.value.categoryNames[i]}
                score={score}
                onClick={() => assignScore(i)}
              />
            ))}
            <ScoreBox category={t.bonus} score={bonus.value} />
          </div>
          <div class="grid row-span-7 grid-rows-subgrid">
            {scores.value.slice(6).map((score, i) => (
              <ScoreBox
                key={i}
                category={i18n.value.categoryNames[i + 6]}
                score={score}
                onClick={() => assignScore(i + 6)}
              />
            ))}
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            {_.range(5).map((i) =>
              i < roll.value.length ? (
                <Die
                  key={i}
                  value={roll.value[i]}
                  onPress={() => {
                    if (roll.value.length === 5) select(i);
                  }}
                  selected={selection.value[i] || throwNum.value >= 3}
                />
              ) : (
                <Die value={0} />
              )
            )}
            <div class="flex-1 flex justify-center items-center">
              {rollComplete && !adviceNeeded.value && !computerPlayer.value && (
                <Button secondary onClick={() => (adviceNeeded.value = true)}>
                  <PigIcon />
                </Button>
              )}
            </div>
          </div>
          <div class="text-xs min-h-6">
            {shouldSelect && t.selectKeepers}
            {shouldAssign && t.pickCategory}
          </div>
        </div>
        {digging.value > 0 && (
          <div class="text-primary-800 absolute bottom-0 right-0">
            <Pig value={digging.value} />
          </div>
        )}
      </div>
      {showInput && (
        <div class="rounded-md p-4 bg-primary-500 text-white space-y-2">
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
      <div class="self-center flex gap-2">
        {canThrow && (
          <Button onClick={rollDice}>
            {selected
              ? t.rollXDice(5 - selected)
              : throwNum.value > 0
              ? t.reRollAll
              : t.rollDice}
          </Button>
        )}
        {!virtualDice.value && adviceNeeded.value && !throwNum.value && (
          <div class="flex gap-2">
            <Button onClick={() => (throwNum.value = 1)}>1. Wurf</Button>
            <Button onClick={() => (throwNum.value = 2)}>2. Wurf</Button>
            <Button onClick={() => (throwNum.value = 3)}>3. Wurf</Button>
          </div>
        )}
        {throwNum.value > 3 && (
          <Button onClick={nextPlayer}>{t.nextPlayer}</Button>
        )}
      </div>
      <Scene numberOfDice={throwing.value} onResult={setResult} />
      {perfect.value && (
        <div class="fixed bottom-[35%] left-1/2 -translate-x-1/2">
          <div key={throwNum.value} class="animate-fly font-extrabold italic">
            {t.perfect}
          </div>
        </div>
      )}
    </div>
  );
}
