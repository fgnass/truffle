import { useSignal } from "@preact/signals";
import alasql from "alasql";
import { useEffect } from "preact/hooks";

export function Highscores() {
  const highscores = useSignal<{ name: string; score: number }[]>([]);
  useEffect(() => {
    alasql("select * from scores order by score desc", undefined, (rows) => {
      highscores.value = rows;
    });
  }, []);
  return (
    <div class="flex-1 flex flex-col gap-6 text-sm w-[500px] max-w-full mx-auto">
      <div class="bg-white shadow-paper p-6 flex flex-col gap-6 relative overflow-hidden">
        <h1 class="font-bold text-xl flex items-center gap-1 leading-none min-h-6">
          Highscores
        </h1>
        <table class="w-full">
          <tbody>
            {highscores.value.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
