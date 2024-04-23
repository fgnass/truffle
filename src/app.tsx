import { useState } from "preact/hooks";
import "./app.css";
import Die from "./Die";
import { Pig } from "./pig";
import { Scene } from "./three/scene";
import _ from "lodash";
import { getCategoryScore } from "./advisor/score-calculator";
import { categoryNames } from "./i18n/en";
import { DeleteIcon, DiceIcon, PenIcon, RedoIcon, UndoIcon } from "./icons";

export function App() {
  const [throwNum, setThrowNum] = useState(0);
  const [manual, setManual] = useState(false);
  const [throwing, setThrowing] = useState(0);
  const [roll, setRoll] = useState<number[]>([]);
  const [selection, setSelection] = useState<boolean[]>(Array(5).fill(false));
  const [scores, setScores] = useState<Array<number | null>>(
    Array(13).fill(null)
  );
  const [prevState, setPrevState] = useState<any>();

  const round = scores.filter((s) => s !== null).length + 1;
  const selected = selection.filter(Boolean).length;

  const assignScore = (cat: number) => {
    if (scores[cat] === null && roll.length === 5) {
      const score = getCategoryScore(cat, roll);
      setPrevState({ scores, roll, throwNum, selection, manual });
      setScores((s) => [...s.slice(0, cat), score, ...s.slice(cat + 1)]);
      setThrowNum(0);
      setRoll([]);
      setSelection(Array(5).fill(false));
    }
  };
  const add = (v: number) => {
    if (prevState?.redo) setPrevState(null);
    if (roll.length === 4) {
      setPrevState({
        scores,
        roll: roll.slice(0, selected),
        throwNum,
        selection,
        manual,
      });
      setManual(false);
    }
    setRoll([...roll, v]);
  };

  const del = () => {
    setRoll((r) => r.slice(0, -1));
  };

  const select = (index: number) =>
    setSelection((s) =>
      s.map((selected, i) => (i === index ? !selected : selected))
    );

  const undo = () => {
    const redoState = {
      scores,
      roll,
      throwNum,
      selection,
      manual,
      redo: !prevState.redo,
    };
    setScores(prevState.scores);
    setRoll(prevState.roll);
    setThrowNum(prevState.throwNum);
    setSelection(prevState.selection);
    setManual(prevState.manual);
    setPrevState(redoState);
  };

  const rollDice = () => {
    if (manual) {
      setPrevState({ scores, roll, throwNum, selection, manual });
      setRoll((roll) => {
        const next = roll.filter((_, i) => selection[i]);
        setSelection(Array(5).fill(true).fill(false, next.length));
        setManual(true);
        setThrowNum((n) => n + 1);
        return next;
      });
    } else {
      setRoll((r) => {
        const roll = r.filter((_, i) => selection[i]);
        if (!throwing) setThrowNum((n) => n + 1);
        setThrowing(5 - roll.length);
        setPrevState(null);
        setSelection(Array(5).fill(true).fill(false, roll.length));
        return roll;
      });
    }
  };

  const throwInProgress = throwing > 0 || manual;
  const lastThrow = throwNum === 3;
  const shouldSelect = roll.length === 5 && !selected && throwNum < 3;
  const canThrow = !lastThrow && !throwInProgress && selected < 5;

  return (
    <>
      <Scene
        numberOfDice={throwing}
        onResult={(result) => {
          setThrowing(0);
          setRoll((r) => r.concat(result).slice(0, 5));
        }}
      />
      <main>
        <h1>
          Round {round}
          <span> – Throw {throwNum || 1}</span>
          {prevState && (
            <button onClick={undo}>
              {prevState.redo ? <RedoIcon /> : <UndoIcon />}
            </button>
          )}
        </h1>
        <div class={`scorecard cols ${manual ? "manual" : ""}`}>
          <div class="rows">
            {scores.slice(0, 6).map((score, i) => (
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
            {scores.slice(6).map((score, i) => (
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
            i < roll.length ? (
              <Die
                key={i}
                value={roll[i]}
                onPress={() => {
                  if (roll.length === 5) select(i);
                }}
                selected={selection[i]}
              />
            ) : (
              <Die value={0} />
            )
          )}
        </div>
        {manual && (
          <>
            <div>Click the dice to enter a roll:</div>
            <div class="dice-input">
              {/* <div style="display:flex">
                <input
                  type="checkbox"
                  class="toggle"
                  checked={manual}
                  onChange={() => setManual((v) => !v)}
                />
                <label>Manual entry</label>
              </div> */}
              <Die value={1} onPress={add} />
              <Die value={2} onPress={add} />
              <Die value={3} onPress={add} />
              <Die value={4} onPress={add} />
              <Die value={5} onPress={add} />
              <Die value={6} onPress={add} />
              <button onClick={del} disabled={!roll.length}>
                <DeleteIcon />
              </button>
            </div>
          </>
        )}
        {shouldSelect && <div>Select the dice you want to keep.</div>}
        <div>
          {(selected === 5 || (lastThrow && roll.length === 5)) && (
            <div>Pick a category for your score.</div>
          )}
          {canThrow && (
            <div>
              {selected
                ? "Keep selected and roll the rest:"
                : roll.length
                ? "Or roll all dice again:"
                : "Roll virtual dice or enter manually:"}
              <button
                onClick={() => {
                  setRoll((r) => {
                    const roll = r.filter((_, i) => selection[i]);
                    if (!throwing) setThrowNum((n) => n + 1);
                    setThrowing(5 - roll.length);
                    setPrevState(null);
                    setSelection(Array(5).fill(true).fill(false, roll.length));
                    return roll;
                  });
                }}
                disabled={
                  manual ||
                  (!throwing &&
                    (throwNum > 2 ||
                      (roll.length > 0 && roll.length < 5) ||
                      selected === 5))
                }
              >
                <DiceIcon />
              </button>
              <button
                onClick={() => {
                  setPrevState({ scores, roll, throwNum, selection, manual });
                  setRoll((roll) => {
                    const next = roll.filter((_, i) => selection[i]);
                    setSelection(Array(5).fill(true).fill(false, next.length));
                    setManual(true);
                    setThrowNum((n) => n + 1);
                    return next;
                  });
                }}
                disabled={manual}
              >
                <PenIcon />
              </button>
            </div>
          )}
        </div>
        {/* <Pig value={4} /> */}
      </main>
    </>
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
