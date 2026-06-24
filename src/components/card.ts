import { styled, tw } from "classname-variants/preact";

// Shared "stitched card" surface: rounded corners, a light-purple gradient, a
// soft purple shadow and a dashed seam (an outline, so it follows the radius and
// stays concentric). One primitive for the Piggy hint modal, the dialogs and the
// Setup / player-picker / results cards so the whole app feels consistent.
// Layout (padding, gap, width) stays with each call site via `class`; `pop` adds
// the dialog entrance animation.
export const StitchedCard = styled("div", {
  base: tw`emboss rounded-3xl bg-gradient-to-b from-primary-50 to-primary-100 text-ink shadow-[0_20px_50px_-12px_rgba(45,16,89,0.55)] ring-1 ring-primary-200 outline outline-2 -outline-offset-[9px] outline-primary-300/80 outline-dashed`,
  variants: {
    pop: { true: tw`animate-popIn` },
  },
});
