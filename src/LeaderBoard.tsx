import { newGame, finalRanking, i18n, rematch } from "./state";
import { Button } from "./styled";

export function LeaderBoard() {
  return (
    <div class="p-6 space-y-8">
      <table class="w-full">
        {finalRanking.value.map((p, i) => (
          <tr key={i}>
            <td>{p.name}</td>
            <td>{p.totalScore}</td>
          </tr>
        ))}
      </table>
      <div class="flex flex-col items-center gap-2">
        <Button onClick={rematch}>{i18n.value.rematch}</Button>
        <Button secondary onClick={newGame}>
          {i18n.value.newGame}
        </Button>
      </div>
    </div>
  );
}
