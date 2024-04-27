import "./app.css";
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

export function Player() {
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
    <div class="player">
      <Scene numberOfDice={throwing.value} onResult={setResult} />
      <h1>
        {players.value.length > 1
          ? t.playerX(currentPlayer.value + 1)
          : t.roundX(round.value)}
        {throwNum.value > 0 && throwNum.value <= 3 && (
          <span> – {t.rollX(throwNum.value)}</span>
        )}
        {prevState.value && (
          <button onClick={undo}>
            {prevState.value.redo ? <RedoIcon /> : <UndoIcon />}
          </button>
        )}
      </h1>
      <div class="scorecard cols">
        <div class="rows">
          {scores.value.slice(0, 6).map((score, i) => (
            <Scorebox
              key={i}
              category={i}
              score={score}
              onPress={assignScore}
            />
          ))}
          <div class="scorebox">
            <div class="category">{t.bonus}</div>
            <div class="score"></div>
          </div>
        </div>
        <div class="rows">
          {scores.value.slice(6).map((score, i) => (
            <Scorebox
              key={i}
              category={i + 6}
              score={score}
              onPress={assignScore}
            />
          ))}
        </div>
      </div>
      <div class="flex">
        <div class="roll">
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
      {showInput && (
        <div class="dice-input">
          <div>{t.clickDiceToEnterRoll}</div>
          <div class="roll">
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
      <div>
        {canThrow && (
          <div>
            <button class="big" onClick={rollDice}>
              {selected
                ? t.rollXDice(5 - selected)
                : throwNum.value > 0
                ? t.reRollAll
                : t.rollDice}
            </button>
          </div>
        )}
      </div>
      {throwNum.value > 3 && (
        <button class="big" onClick={nextPlayer}>
          {t.nextPlayer}
        </button>
      )}
      {/* <Pig value={4} /> */}
    </div>
  );
}

function Scorebox({
  category,
  score,
  onPress,
}: {
  category: number;
  score: number | null;
  onPress: (category: number) => unknown;
}) {
  return (
    <div class="scorebox" onClick={() => onPress(category)}>
      <div class="category">{i18n.value.categoryNames[category]}</div>
      <div class="score">{score}</div>
    </div>
  );
}
