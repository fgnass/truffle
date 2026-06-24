import { ComponentChildren } from "preact";
import { Medal } from "lucide-preact";
import { i18n } from "../state";
import { playerSummary } from "../stats";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerName } from "./PlayerName";

// One player's all-time summary: avatar, name, headline best score and a small
// stats table. Shared by the Stats screen (wrapped in a stitched card) and the
// end-of-game leaderboard dialog (where it sits bare on the dialog's surface) —
// the surrounding card chrome is the caller's job via `class`.

const pct = (r: number) => `${Math.round(r * 100)}%`;

function StatRow({
  label,
  value,
}: {
  label: ComponentChildren;
  value: ComponentChildren;
}) {
  return (
    <div class="flex items-center justify-between border-t border-primary-200/70 py-2">
      <dt class="flex items-center gap-1.5 text-sm text-primary-600">
        {label}
      </dt>
      <dd class="leading-none">{value}</dd>
    </div>
  );
}

// "12%  3" — small percentage in front, big absolute count behind.
function RateValue({
  rate,
  count,
  countClass = "text-ink",
}: {
  rate: number | null;
  count: number;
  countClass?: string;
}) {
  return (
    <span class="font-digits">
      {rate !== null && (
        <span class="mr-1.5 text-sm text-primary-500">{pct(rate)}</span>
      )}
      <span class={`text-2xl ${countClass}`}>{count}</span>
    </span>
  );
}

export function PlayerStatsCard({
  name,
  class: cls = "",
}: {
  name: string;
  class?: string;
}) {
  const t = i18n.value;
  const s = playerSummary(name);
  return (
    <div class={`flex flex-col items-center gap-4 ${cls}`}>
      <PlayerAvatar name={name} piggy={!s.human} size="xl" />
      <div class="text-center">
        <PlayerName name={name} piggy={!s.human} size="lg" />
        <div class="mt-1 text-xs text-primary-400">{t.gamesCount(s.games)}</div>
      </div>

      {s.games === 0 ? (
        <p class="py-4 text-sm text-primary-400">{t.noGamesYet}</p>
      ) : (
        <>
          <div class="flex flex-col items-center">
            <span class="text-xs font-semibold tracking-wide text-primary-400 uppercase">
              {t.statBest}
            </span>
            <span class="font-digits text-5xl leading-none text-ink">
              {s.best}
            </span>
          </div>
          <dl class="w-full">
            <StatRow
              label={
                <>
                  {t.statWins}
                  <Medal class="size-4 text-amber-500" />
                </>
              }
              value={<RateValue rate={s.winRate} count={s.wins} />}
            />
            <StatRow
              label={t.statTruffles}
              value={<RateValue rate={null} count={s.truffles} />}
            />
            <StatRow
              label={t.statCombo}
              value={
                <span class="font-digits text-2xl text-amber-500">
                  ×{s.bestCombo}
                </span>
              }
            />
            <StatRow
              label={t.statFlawless}
              value={
                <span class="font-digits text-2xl text-emerald-600">
                  {s.flawlessGames}
                </span>
              }
            />
          </dl>
        </>
      )}
    </div>
  );
}
