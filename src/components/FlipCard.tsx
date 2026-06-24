import { ComponentChildren } from "preact";

// A two-faced card that flips front → back, like a coin landing face-up — used
// for the avatar→rank-disc reveal on the results rows. The 3D mechanics live in
// index.css (.flip / .flip-inner / .flip-face / .flip-back); this just wires the
// `flipped` state and an optional staggered `delay`.
export function FlipCard({
  flipped,
  delay = "0ms",
  front,
  back,
  class: cls = "",
}: {
  flipped: boolean;
  delay?: string;
  front: ComponentChildren;
  back: ComponentChildren;
  class?: string;
}) {
  return (
    <div class={`flip ${cls}`}>
      <div
        class={`flip-inner ${flipped ? "is-flipped" : ""}`}
        style={{ transitionDelay: delay }}
      >
        <div class="flip-face">{front}</div>
        <div class="flip-face flip-back">{back}</div>
      </div>
    </div>
  );
}
