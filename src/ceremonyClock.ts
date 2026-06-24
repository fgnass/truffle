import { Signal } from "@preact/signals";

export const reduceMotion =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// easeOutCubic — decelerates into the final number, no overshoot.
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

// A cancellable clock used to choreograph the end-game ceremony: `delay` resolves
// early when cancelled (so a skip tap drains the whole pending sequence
// immediately), and `animate` tweens a signal from→to over `ms`, jumping
// straight to the target if cancelled or under reduced motion.
export function makeClock() {
  let cancelled = false;
  const pending = new Set<() => void>();
  return {
    get cancelled() {
      return cancelled;
    },
    delay(ms: number) {
      return new Promise<void>((resolve) => {
        if (cancelled) return resolve();
        const done = () => {
          clearTimeout(id);
          pending.delete(done);
          resolve();
        };
        const id = setTimeout(done, ms);
        pending.add(done);
      });
    },
    animate(sig: Signal<number>, from: number, to: number, ms: number) {
      return new Promise<void>((resolve) => {
        if (cancelled || reduceMotion || ms <= 0) {
          sig.value = to;
          return resolve();
        }
        const start = performance.now();
        const step = (now: number) => {
          if (cancelled) {
            sig.value = to;
            return resolve();
          }
          const t = Math.min(1, (now - start) / ms);
          sig.value = Math.round(from + (to - from) * ease(t));
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    cancel() {
      cancelled = true;
      pending.forEach((fn) => fn());
      pending.clear();
    },
  };
}
