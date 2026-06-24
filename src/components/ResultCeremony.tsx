import { Signal, useSignal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { styled, tw } from "classname-variants/preact";
import { useEffect } from "preact/hooks";
import { i18n, openStats, players, type PlayerState } from "../state";
import { compareToHistory, highScores, rankPlayers } from "../stats";
import { makeClock, reduceMotion } from "../ceremonyClock";
import { Trophy } from "lucide-preact";
import { Badge } from "./Badge";
import { FlipCard } from "./FlipCard";
import { Medal, COIN_SHADOW } from "./Medal";
import { RankBadge } from "./RankBadge";
import { PlayerAvatar } from "./PlayerAvatar";

// A results row. `active` tints the player the tally is currently on, `pending`
// dims those not yet reached, and `tappable` makes a landed row open that
// player's stats. Branch in the variant map, not stacked ternaries.
const Row = styled("div", {
  base: tw`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-[opacity,background-color] duration-300`,
  variants: {
    active: { true: tw`bg-primary-100` },
    pending: { true: tw`opacity-50`, false: tw`opacity-100` },
    tappable: {
      true: tw`cursor-pointer hover:bg-primary-100 active:scale-[0.99]`,
    },
  },
  defaultVariants: { pending: false },
});

// ---------------------------------------------------------------------------
// The end-of-game ceremony. Instead of dropping the final leaderboard in all at
// once, it re-stages the ritual of scoring a real sheet: every player's total
// builds upper → bonus → lower, and locking it sorts their row into rank. Once
// everyone has landed, medals stamp onto the podium and a pile of poo drops on
// last place. Then `finished` flips and LeaderBoard reveals the scorecards.
//
// A solo game (one human) skips the ranking drama: it plays a single personal
// tally, shows how the game stacks up, and slides straight into Stats.
// ---------------------------------------------------------------------------

// Run the reorder inside a view transition so rows FLIP to their new position
// (same primitive App uses for screen morphs). Each row carries a unique
// view-transition-name; we wait for Preact to commit before the snapshot.
function reorder(apply: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => Promise<void> | void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };
  if (reduceMotion || !doc.startViewTransition) {
    apply();
    return Promise.resolve();
  }
  const vt = doc.startViewTransition(async () => {
    apply();
    // Let Preact's signal-driven re-render commit before the "new" snapshot.
    // That re-render is queued as a microtask, so awaiting microtasks here is
    // enough — and crucially, requestAnimationFrame does NOT fire during the
    // update-callback phase, so awaiting frames would deadlock into a 4s
    // TimeoutError (the reorder would then jump instead of animating).
    await Promise.resolve();
    await Promise.resolve();
  });
  // `ready` rejects if the browser skips the transition; we don't care.
  vt.ready?.catch(() => {});
  return vt.finished.catch(() => {});
}

const total = (p: PlayerState) => p.totalScore.value;

export function ResultCeremony({
  solo,
  finished,
  onSelect,
}: {
  solo: boolean;
  finished: Signal<boolean>;
  // Once the ceremony has settled, tapping a row opens that player's stats.
  onSelect?: (name: string) => void;
}) {
  const t = i18n.value;

  // Play order (the seating) and the per-player final rank (ties share a rank).
  const order = players.value;
  const ranks = rankPlayers(order.map(total));
  const lastRank = Math.max(...ranks);
  // The wooden-spoon poo only appears with a real field to lose in — three or
  // more players. A two-player game settles to gold + silver, no booby prize.
  const isLast = (i: number) =>
    order.length >= 3 && lastRank > 1 && ranks[i] === lastRank;

  // --- transient ceremony state ------------------------------------------
  const displayOrder = useSignal(order.map((_, i) => i)); // indices, current row order
  const locked = useSignal<number[]>([]); // players whose total has landed
  const activeIndex = useSignal(-1); // player mid-tally, or -1
  const displayTotal = useSignal(0); // the counting number for the active player
  const chapter = useSignal<"upper" | "bonus" | "lower" | null>(null);
  const bonusChip = useSignal(false); // the "+35" stamp during the bonus beat
  const medalsShown = useSignal(false);
  const pooShown = useSignal(false);
  const soloHeadline = useSignal(false); // solo: reveal the comparison line

  useEffect(() => {
    const clock = makeClock();

    const finalOrder = () =>
      [...order.keys()].sort((a, b) => total(order[b]) - total(order[a]));

    // Skip: drain the sequence and snap to the settled end state.
    const skip = () => {
      if (finished.value) return;
      clock.cancel();
      if (solo) {
        openStats([order[0].name.value ?? ""]);
        return;
      }
      displayOrder.value = finalOrder();
      locked.value = order.map((_, i) => i);
      activeIndex.value = -1;
      chapter.value = null;
      bonusChip.value = false;
      medalsShown.value = true;
      pooShown.value = true;
      finished.value = true;
    };

    const tally = async (i: number, durUp: number, durLow: number) => {
      const p = order[i];
      activeIndex.value = i;
      bonusChip.value = false;
      chapter.value = "upper";
      await clock.animate(displayTotal, 0, p.upperScore.value ?? 0, durUp);
      if (clock.cancelled) return;
      chapter.value = "bonus";
      await clock.delay(520);
      if (clock.cancelled) return;
      if (p.bonus.value) {
        bonusChip.value = true;
        await clock.animate(
          displayTotal,
          p.upperScore.value ?? 0,
          (p.upperScore.value ?? 0) + 35,
          360,
        );
      } else {
        await clock.delay(420);
      }
      if (clock.cancelled) return;
      chapter.value = "lower";
      await clock.animate(displayTotal, displayTotal.value, total(p), durLow);
    };

    const runSolo = async () => {
      if (reduceMotion) {
        openStats([order[0].name.value ?? ""]);
        return;
      }
      await clock.delay(350);
      if (clock.cancelled) return;
      await tally(0, 800, 800);
      if (clock.cancelled) return;
      locked.value = [0];
      activeIndex.value = -1;
      chapter.value = null;
      bonusChip.value = false;
      soloHeadline.value = true;
      await clock.delay(2200);
      if (clock.cancelled) return;
      openStats([order[0].name.value ?? ""]);
    };

    const runRanked = async () => {
      if (reduceMotion) {
        skip();
        return;
      }
      await clock.delay(450);
      const revealed: number[] = [];
      for (let k = 0; k < order.length && !clock.cancelled; k++) {
        // First player sets the rhythm; later ones quicken a touch.
        const fast = k > 0;
        await tally(k, fast ? 520 : 650, fast ? 520 : 650);
        if (clock.cancelled) return;
        await clock.delay(340);
        revealed.push(k);
        locked.value = [...revealed];
        activeIndex.value = -1;
        chapter.value = null;
        bonusChip.value = false;
        await reorder(() => {
          displayOrder.value = [
            ...[...revealed].sort((a, b) => total(order[b]) - total(order[a])),
            ...order.map((_, i) => i).filter((i) => !revealed.includes(i)),
          ];
        });
        await clock.delay(180);
      }
      if (clock.cancelled) return;
      await clock.delay(320);
      medalsShown.value = true;
      await clock.delay(560);
      if (order.some((_, i) => isLast(i))) {
        pooShown.value = true;
        await clock.delay(620);
      }
      if (clock.cancelled) return;
      finished.value = true;
    };

    void (solo ? runSolo() : runRanked());

    // Tap anywhere to skip (capture so it beats row clicks).
    const onTap = () => skip();
    window.addEventListener("pointerdown", onTap, { capture: true });
    return () => {
      clock.cancel();
      window.removeEventListener("pointerdown", onTap, { capture: true });
    };
    // Build once per game; the roster is fixed by the time we get here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The number to show for a given player index.
  const cellTotal = (i: number) => {
    if (finished.value) return total(order[i]);
    if (i === activeIndex.value) return displayTotal.value;
    if (locked.value.includes(i)) return total(order[i]);
    return null;
  };

  // ---- solo: a single centred tally that slides into Stats ----
  if (solo) {
    const p = order[0];
    const name = p.name.value ?? "";
    const cmp = compareToHistory(name, total(p));
    const num = cellTotal(0);
    return (
      <div class="flex flex-col items-center gap-3 py-10 text-white">
        <div class="drop-emboss font-digits text-3xl leading-none text-white">
          {name}
        </div>
        <div class="h-5 text-sm font-medium text-white/80">
          {chapter.value === "upper"
            ? t.tallyUpper
            : chapter.value === "bonus"
              ? p.bonus.value
                ? `${t.tallyBonus} +35`
                : t.tallyNoBonus
              : chapter.value === "lower"
                ? t.tallyLower
                : ""}
        </div>
        <div class="drop-emboss font-digits text-7xl leading-none text-white">
          {num ?? "–"}
        </div>
        {soloHeadline.value && (
          <div class="mt-2 flex animate-fadeIn flex-col items-center gap-1 text-center">
            <span class="text-lg font-medium text-white">
              {cmp.isFirst
                ? t.cmpFirst
                : cmp.isBest
                  ? t.cmpBest
                  : t.cmpRankYours(cmp.rank, cmp.of)}
            </span>
            <span class="text-sm text-white/70">{t.viewStats}…</span>
          </div>
        )}
      </div>
    );
  }

  // ---- multiplayer: the ranked tally (rendered inside the results dialog) ----

  // A player's score milestone, celebrated the moment their tally lands. The
  // finished game is already in the log, so highScores()/compareToHistory()
  // include it. We only crow when *this* game is the player's personal best, so
  // a returning player whose older score still tops the board isn't re-credited.
  // Every milestone shares one badge style (see the render below) — only the
  // text and the optional trophy differ. Kept off gold so it doesn't compete
  // with the gold/silver/bronze coins.
  const milestoneFor = (
    p: PlayerState,
  ): { text: string; icon?: typeof Trophy } | null => {
    if (!p.human) return null;
    const name = p.name.value ?? "";
    const tot = total(p);
    const cmp = compareToHistory(name, tot);
    const newBest = cmp.isBest || cmp.isFirst;
    if (!newBest) return null;
    const board = highScores(undefined, 10);
    const idx = board.findIndex((e) => e.name === name && e.score === tot);
    if (idx === 0) return { text: t.allTimeHigh, icon: Trophy };
    if (idx > 0) return { text: `${t.highScoreHit} #${idx + 1}` };
    if (cmp.isBest) return { text: t.cmpBest };
    return { text: t.cmpFirst };
  };

  // The rank disc that rides the back of each row's flip card — the same coin as
  // the high-score list, except last place carries the poo here.
  const disc = (i: number): ComponentChildren =>
    isLast(i) ? (
      <Medal kind="poo" animate={false} />
    ) : (
      <RankBadge rank={ranks[i]} />
    );

  const tappable = finished.value && !!onSelect;

  return (
    <div class="flex flex-col">
      <div class="flex flex-col gap-1 text-ink">
        {displayOrder.value.map((i, pos) => {
          const p = order[i];
          if (!p) return null; // roster changed out from under us — skip
          const name = p.name.value ?? "";
          const isActive = i === activeIndex.value && !finished.value;
          const isLocked = finished.value || locked.value.includes(i);
          const num = cellTotal(i);

          // Faces flip from avatar to rank disc only at the reveal beat, rippling
          // top-to-bottom (staggered by the row's settled position) so ranks stay
          // hidden until everyone has landed. The per-row step is a good fraction
          // of the 600ms flip so the cascade reads as a distinct ripple rather
          // than all the coins turning at once.
          const flipped = medalsShown.value || finished.value;
          const mile = isLocked ? milestoneFor(p) : null;
          const MileIcon = mile?.icon;

          // Not-yet-tallied rows recede; the running result stays solid.
          const isPending = !isLocked && !isActive;
          const caption =
            isActive && chapter.value
              ? chapter.value === "upper"
                ? t.tallyUpper
                : chapter.value === "bonus"
                  ? p.bonus.value
                    ? t.tallyBonus
                    : t.tallyNoBonus
                  : t.tallyLower
              : "";

          return (
            <Row
              key={i}
              active={isActive}
              pending={isPending}
              tappable={tappable}
              style={{ viewTransitionName: `cr-${i}` }}
              onClick={tappable ? () => onSelect!(name) : undefined}
            >
              <FlipCard
                class="size-11 shrink-0"
                flipped={flipped}
                delay={flipped ? `${pos * 170}ms` : "0ms"}
                front={
                  <PlayerAvatar
                    name={name}
                    piggy={!p.human}
                    size="sm"
                    style={{ boxShadow: COIN_SHADOW }}
                  />
                }
                back={disc(i)}
              />
              <div class="min-w-0 flex-1">
                <div class="truncate text-lg leading-tight font-medium text-ink">
                  {name}
                </div>
                {/* Reserve the sub-line so rows keep a constant height while the
                    tally moves between them. Once a player lands it shows their
                    score milestone, or — when there's no badge to show — doubles
                    as the "tap for stats" affordance, filling the gap. */}
                <div class="flex h-5 items-center leading-tight">
                  {mile ? (
                    <Badge tone="best" class="animate-fadeIn gap-1">
                      {MileIcon && <MileIcon class="size-3" />}
                      {mile.text}
                    </Badge>
                  ) : tappable ? (
                    <span class="animate-fadeIn text-caption font-medium text-primary-400">
                      {t.rowStatsHint}
                    </span>
                  ) : (
                    <span class="text-xs font-medium text-primary-500">
                      {caption}
                    </span>
                  )}
                </div>
              </div>
              <div class="relative shrink-0 self-center text-right">
                <span class="emboss font-digits text-3xl leading-none text-ink">
                  {num ?? "–"}
                </span>
                {isActive && bonusChip.value && (
                  // Reuses the gold tone (same amber treatment as the milestone
                  // badges) at the tighter `sm` size. Weight follows the tone
                  // (semibold) — overriding it back to bold would need a
                  // class-merge helper (tailwind-merge), which isn't wired up.
                  <Badge
                    tone="gold"
                    size="sm"
                    class="absolute -top-4 -right-1 animate-popIn"
                  >
                    +35
                  </Badge>
                )}
              </div>
            </Row>
          );
        })}
      </div>
      {/* Reserve the line's height so the card doesn't shrink (and the screen
          re-centre) the moment the ceremony finishes and the hint clears. */}
      <div class="mt-4 h-4 text-center text-xs text-primary-400">
        {!finished.value && <span class="animate-fadeIn">{t.tapToSkip}</span>}
      </div>
    </div>
  );
}
