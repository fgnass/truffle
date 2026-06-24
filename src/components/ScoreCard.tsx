import { PlayerState } from "../state";
import { PaperCard } from "./PaperCard";
import { ScoreSheet } from "./ScoreSheet";

type Props = { player: PlayerState };

export function ScoreCard({ player }: Props) {
  return (
    <PaperCard title={player.name}>
      <ScoreSheet player={player} class="gap-4" />
    </PaperCard>
  );
}
