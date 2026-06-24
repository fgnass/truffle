import { useComputed } from "@preact/signals";
import { allResults } from "../stats";
import { PaperCard } from "./PaperCard";

export function Highscores() {
  const highscores = useComputed(() =>
    [...allResults.value].sort((a, b) => b.total - a.total)
  );
  return (
    <PaperCard title="Highscores">
      <table class="w-full">
        <tbody>
          {highscores.value.map((row, i) => (
            <tr key={i}>
              <td>{row.name}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PaperCard>
  );
}
