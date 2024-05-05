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
  manual,
  players,
  digging,
} from "./state";
import { Scene } from "./three/scene";
import { Button } from "./styled";
import { Pig } from "./pig";

export function Game() {
  const {
    scores,
    bonus,
    roll,
    selection,
    throwNum,
    prevState,
    advice,
    adviceNeeded,
    name,
  } = currentPlayerState.value;

  const t = i18n.value;
  const rollComplete = roll.value.length === 5;
  const showInput = manual.value && !rollComplete;
  const selected = selection.value.filter(Boolean).length;
  const throwInProgress = throwing.value > 0;
  const lastThrow = throwNum.value >= 3;

  const shouldAssign =
    selected === 5 ||
    (lastThrow && rollComplete) ||
    (manual.value && !adviceNeeded.value && rollComplete);

  const shouldSelect =
    !manual.value && rollComplete && throwNum.value < 3 && !selected;

  const canThrow =
    (!manual.value || throwNum.value > 0) &&
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
            <Scorebox category={t.bonus} score={bonus.value} />
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
              {rollComplete && !adviceNeeded.value && (
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
        {adviceNeeded.value && !throwNum.value && (
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
      class="border-b border-neutral-400 p-1 grid grid-cols-[5fr_2fr] items-end min-h-10"
      onClick={onClick}
    >
      <div class="w-[min(4rem,100%)] justify-self-start text-xs leading-tight">
        {category}
      </div>
      <div class="font-digits justify-self-end text-blue-700 leading-none text-lg">
        {score === 0 ? "–" : score}
      </div>
    </div>
  );
}
