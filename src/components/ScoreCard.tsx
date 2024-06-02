import _ from "lodash";
import { i18n, PlayerState } from "../state";
import { ScoreBox } from "./ScoreBox";

type Props = { player: PlayerState };

export function ScoreCard({ player }: Props) {
  const { name, scores, bonus } = player;
  const t = i18n.value;
  return (
    <div class="flex-1 flex flex-col gap-6 text-sm w-[500px] max-w-full mx-auto">
      <div class="bg-white shadow-paper p-6 flex flex-col gap-6 relative overflow-hidden">
        <h1 class="font-bold text-xl flex items-center gap-1 leading-none min-h-6">
          {name}
        </h1>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid row-span-7 grid-rows-subgrid">
            {scores.value.slice(0, 6).map((score, i) => (
              <ScoreBox
                key={i}
                category={i18n.value.categoryNames[i]}
                score={score}
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
