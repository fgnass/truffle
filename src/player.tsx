import "./app.css";
import Die from "./Die";
import _ from "lodash";
import { categoryNames } from "./i18n/en";
import { DeleteIcon, DiceIcon, RedoIcon, UndoIcon } from "./icons";
import {
  currentPlayerState,
  add,
  assignScore,
  del,
  select,
  rollDice,
  undo,
  round,
  throwing,
} from "./state";

export function Player() {
  console.log(currentPlayerState.value);

  const { scores, roll, selection, throwNum, entering, prevState } =
    currentPlayerState.value;

  const selected = selection.value.filter(Boolean).length;
  const throwInProgress = throwing.value > 0 || entering.value;
  const lastThrow = throwNum.value === 3;
  const shouldSelect =
    roll.value.length === 5 && !selected && throwNum.value < 3;
  const canThrow = !lastThrow && !throwInProgress && selected < 5;

  return (
    <div class="player">
      <h1>
        Round {round}
        <span> – Throw {throwNum.value || 1}</span>
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
            <div class="category">Bonus</div>
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
      </div>
      {entering.value && (
        <>
          <div>Click the dice to enter a roll:</div>
          <div class="dice-input">
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
        </>
      )}
      {shouldSelect && <div>Select the dice you want to keep.</div>}
      <div>
        {(selected === 5 || (lastThrow && roll.value.length === 5)) && (
          <div>Pick a category for your score.</div>
        )}
        {canThrow && (
          <div>
            {selected
              ? "Keep selected and roll the rest:"
              : roll.value.length
              ? "Or roll all dice again:"
              : "Roll virtual dice or enter manually:"}
            <button onClick={rollDice}>
              <DiceIcon />
            </button>
          </div>
        )}
      </div>
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
      <div class="category">{categoryNames[category]}</div>
      <div class="score">{score}</div>
    </div>
  );
}
