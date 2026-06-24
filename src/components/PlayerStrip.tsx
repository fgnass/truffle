import { Check, WifiOff } from "lucide-preact";
import { globalRound, i18n, localPlayer, players } from "../state";
import { avatarFor, featureColor } from "../components/avatar";

// Compact live standings of every seat in an online game: avatar, name, running
// total, and a per-player status (✓ done with the current round, the round
// number otherwise, or a disconnected marker). The local player is highlighted.
export function PlayerStrip({ class: className = "" }: { class?: string }) {
  const t = i18n.value;
  const round = globalRound.value;

  return (
    <div class={`flex flex-wrap justify-center gap-2 ${className}`}>
      {players.value.map((p, i) => {
        const name = p.name.value ?? "";
        const filled = p.scores.value.filter((s) => s !== null).length;
        const ahead = filled > round; // finished this round, waiting on others
        const gone = !p.connected.value;
        const isLocal = i === localPlayer.value;
        return (
          <div
            key={p.id || i}
            class={
              "flex items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow-subtle " +
              (gone ? "opacity-40" : "") +
              (isLocal ? " ring-2 ring-primary-400" : "")
            }
          >
            <img src={avatarFor(name)} alt="" class="size-7 rounded-full" />
            <span
              style={{ color: featureColor(name) }}
              class="max-w-20 truncate font-logo text-sm leading-none"
            >
              {name}
            </span>
            <span class="font-digits text-sm text-ink">{p.totalScore.value}</span>
            <span class="grid size-5 place-items-center">
              {gone ? (
                <WifiOff class="size-3.5 text-neutral-400" />
              ) : ahead ? (
                <Check class="size-4 text-emerald-500" strokeWidth={3} />
              ) : (
                <span class="font-digits text-xs text-neutral-400">
                  {t.roundShort(filled + 1)}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
