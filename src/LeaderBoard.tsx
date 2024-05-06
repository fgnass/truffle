import { finalRanking, i18n, newGame } from "./state";
import { Button } from "./styled";

export function LeaderBoard() {
  return (
    <div class="p-6 space-y-3">
      <table class="w-full">
        {finalRanking.value.map((p, i) => (
          <tr key={i}>
            <td>{p.name}</td>
            <td>{p.totalScore}</td>
          </tr>
        ))}
      </table>
      <Button onClick={newGame}>{i18n.value.playAgain}</Button>
    </div>
  );
}
