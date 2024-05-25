import { ScoreCard } from "./ScoreCard";
import { newGame, finalRanking, i18n, playAgain, players } from "./state";
import { Button } from "./styled";

export function LeaderBoard() {
  return (
    <div class="py-6">
      <table class="mx-6 w-full">
        {finalRanking.value.map((p, i) => (
          <tr key={i}>
            <td>{p.name}</td>
            <td>{p.totalScore}</td>
          </tr>
        ))}
      </table>
      <div class="flex *:flex-[0_0_auto] overflow-x-auto p-6 gap-2 mb-6">
        {players.value.map((p, i) => (
          <div key={i} class="max-w-[80vw]">
            <ScoreCard player={p} />
          </div>
        ))}
      </div>
      <div class="flex flex-col items-center gap-2">
        <Button onClick={playAgain}>{i18n.value.playAgain}</Button>
        <Button secondary onClick={newGame}>
          {i18n.value.newGame}
        </Button>
      </div>
    </div>
  );
}
