import { Modal } from "./Modal";
import { PlayerStatsCard } from "./PlayerStatsCard";

// Tapping a player anywhere (the leaderboard scoreboard, the high-score list,
// the stats screen) brings up their all-time summary as a floating card. When
// reached from the high-score list, `onBack` returns there instead of closing.
export function PlayerStatsModal({
  name,
  onClose,
  onBack,
}: {
  name: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <Modal onClose={onClose} onBack={onBack} class="w-full max-w-xs">
      <PlayerStatsCard name={name} />
    </Modal>
  );
}
